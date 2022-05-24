const hre = require("hardhat");
const { ethers } = require("hardhat");
const { expect } = require("chai");

const { fixture } = require("../fixture");

describe("Rocket Vault", async () => {
  before(async function () {
    if (!hre.network.config.forking || !hre.network.config.forking.enabled) {
      this.skip();
    }
  });

  // fixture values
  let deployer, user, user2;
  let vaultAccounting;
  let vaultManagement;
  let vaultNames;

  // vault parameters
  let depositAmount;
  let expectedEthAmount;
  let expectedLpToken;
  let expectedLpTokenAmount;
  let rocketVault;
  let rETH;
  let impersonateWithdrawAddress;
  let impersonateDepositAddress;
  let depositPoolAddress;
  let depositPool;
  let rocketDirectVault;
  let rocketPoolStorageAddress;
  let rocketVaultStorageAddress;
  let rocketVaultStorage;
  let userAddressData;

  // slippage upon getAmountEth conversion
  const conversionDelta = ethers.utils.parseEther("0.00000001");

  beforeEach(async () => {
    // initialize fixture values
    ({ vaultAccounting, vaultManagement, vaultNames } = await fixture());
    [deployer, user, user2] = await ethers.getSigners();

    // initialize vault parameters
    depositAmount = ethers.utils.parseEther("1.0");
    expectedEthAmount = ethers.utils.parseEther("1.0");
    expectedLpToken = "0xae78736Cd615f374D3085123A210448E74Fc6393"; // rETH token address
    rocketVault = await ethers.getContractAt("IVault", await vaultManagement.getVault(vaultNames.rocketVault));
    expectedLpTokenAmount = await rocketVault.getAmountLpTokens(depositAmount); //gets rETH amount equivalent to 1 ETH
    rETH = await ethers.getContractAt("IRocketTokenRETH", expectedLpToken);
    impersonateWithdrawAddress = "0x7Fe2547Bcb8FCE1D51f2A2C0d9D93174Cd05b3f9";
    impersonateDepositAddress = "0x2FAF487A4414Fe77e2327F0bf4AE2a264a776AD2";
    depositPoolAddress = "0x4D05E3d48a938db4b7a9A59A802D5b45011BDe58";
    depositPool = await ethers.getContractAt("IRocketDepositPool", depositPoolAddress);
    userAddressData = await ethers.utils.defaultAbiCoder.encode(["address"], [user.address]);
    rocketDirectVault = await ethers.getContractAt(
      "RocketVault",
      await vaultManagement.getVault(vaultNames.rocketVault)
    );
    rocketPoolStorageAddress = "0x1d8f8f00cfa6758d7bE78336684788Fb0ee0Fa46";
    rocketVaultStorageAddress = await rocketDirectVault.getVaultStorage();
    rocketVaultStorage = await ethers.getContractAt("RocketPoolVaultStorage", rocketVaultStorageAddress);

    // // // impersonate user and redeem rETH to make room for testing if needed
    // await hre.network.provider.request({
    //   method: "hardhat_impersonateAccount",
    //   params: [impersonateWithdrawAddress],
    // });
    // const signer = await ethers.getSigner(impersonateWithdrawAddress);

    // const burnAmount = ethers.utils.parseUnits("1.5"); // 1.5 rETH

    // const approvetx = await rETH.connect(signer).approve(rETH.address, burnAmount);
    // await approvetx.wait();

    // const burntx = await rETH.connect(signer).burn(burnAmount);
    // await burntx.wait();
    // console.log("done");

    // impersonate user and deposit ETH to make room for withdrawal if needed
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonateDepositAddress],
    });
    const signer = await ethers.getSigner(impersonateDepositAddress);

    const depositEtherAmount = ethers.utils.parseEther("1000");

    const depositTx = await depositPool.connect(signer).deposit({ value: depositEtherAmount });
    await depositTx.wait();
  });

  it("should reflect correct conversion from lp tokens to ETH", async () => {
    expect(await rocketVault.getAmountETH(expectedLpTokenAmount)).to.be.closeTo(expectedEthAmount, conversionDelta);
  });

  it("should reflect correct conversion from ETH to lp tokens", async () => {
    expect(await rocketVault.getAmountLpTokens(expectedEthAmount)).to.be.equal(expectedLpTokenAmount);
  });

  it("should return the correct lp token", async () => {
    expect(await rocketVault.getLpToken()).to.equal(expectedLpToken);
  });

  it("should deposit specified amount and reflect correct balance in delegate address", async () => {
    // user info prior to deposit
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(0);
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.equal(0);

    // set up the deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx.wait();

    // user info after deposit
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(
      expectedLpTokenAmount
    );
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.be.closeTo(
      expectedEthAmount,
      conversionDelta
    );

    // get delegate address and check if rETH was minted
    delegateAddress = await rocketVaultStorage.getDelegateAddress(user.address);
    expect(await rETH.balanceOf(delegateAddress)).to.equal(expectedLpTokenAmount);
  });

  it("should withdraw specified amount and reflect correct balance in delegate address", async () => {
    // user info prior to deposit
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(0);
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.equal(0);

    // set up the deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx.wait();

    // user info after deposit
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(
      expectedLpTokenAmount
    );
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.be.closeTo(
      expectedEthAmount,
      conversionDelta
    );

    // get delegate address and check if rETH was minted
    delegateAddress = await rocketVaultStorage.getDelegateAddress(user.address);
    expect(await rETH.balanceOf(delegateAddress)).to.equal(expectedLpTokenAmount);

    // fast forward through withdrawal time restriction
    await hre.network.provider.send("hardhat_mine", ["0x2710"]); // 10000 blocks

    // initiate withdrawal
    tx = await vaultAccounting.connect(user).withdraw(expectedLpTokenAmount, vaultNames.rocketVault);
    await tx.wait();

    // user info after withdrawal
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(0);
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.empty)).to.equal(0);
    expect(await rETH.balanceOf(delegateAddress)).to.equal(0);
  });

  it("should upgrade vault and set new implementation", async () => {
    // user info prior to deposit
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(0);
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.equal(0);

    // set up the deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx.wait();

    // user info after deposit
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(
      expectedLpTokenAmount
    );
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.be.closeTo(
      expectedEthAmount,
      conversionDelta
    );

    // get delegate address and check if rETH was minted
    delegateAddress = await rocketVaultStorage.getDelegateAddress(user.address);
    expect(await rETH.balanceOf(delegateAddress)).to.equal(expectedLpTokenAmount);

    // deploy new rocket vault
    const NewRocketVault = await ethers.getContractFactory("TestRocketVault");
    const newRocketVault = await NewRocketVault.deploy(
      vaultManagement.address,
      rocketPoolStorageAddress,
      rocketVaultStorageAddress
    );
    await newRocketVault.deployed();

    // upgrade vault
    tx = await vaultManagement.upgradeVault(vaultNames.rocketVault, newRocketVault.address);
    await tx.wait();

    // check currentImplementation on rocketVaultStorage
    expect(await rocketVaultStorage.owner()).to.equal(newRocketVault.address);

    // verify user balance has not changed
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(
      expectedLpTokenAmount
    );
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.be.lte(expectedEthAmount);

    // fast forward through withdrawal time restriction
    await hre.network.provider.send("hardhat_mine", ["0x2710"]); // 10000 blocks

    // verify that user can still withdraw
    tx = await vaultAccounting.connect(user).withdraw(expectedLpTokenAmount, vaultNames.rocketVault);
    await tx.wait();

    // verify that delegate address rETH balance is correct
    expect(await rETH.balanceOf(delegateAddress)).to.equal(0);
  });

  it("should allow LP token deposits and reflect correct balance in delegate address", async () => {
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(0);
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.equal(0);

    // set up the deposit
    tx = await depositPool.connect(user).deposit({ value: depositAmount });
    await tx.wait();

    // fast forward through transfer time restriction
    await hre.network.provider.send("hardhat_mine", ["0x2710"]); // 10000 blocks

    // approve rETH to vault
    approvetx = await rETH.connect(user).approve(rocketVault.address, expectedLpTokenAmount);
    await approvetx.wait();

    // deposit rETH into rocket vault
    tx = await vaultAccounting.connect(user).depositLpToken(vaultNames.rocketVault, expectedLpTokenAmount);
    await tx.wait();

    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(
      expectedLpTokenAmount
    );
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.be.closeTo(
      expectedEthAmount,
      conversionDelta
    );

    // get delegate address and check if rETH was transferred
    delegateAddress = await rocketVaultStorage.getDelegateAddress(user.address);
    expect(await rETH.balanceOf(delegateAddress)).to.equal(expectedLpTokenAmount);
  });

  it("should allow LP token withdrawals", async () => {
    // user info prior to deposit
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(0);
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.equal(0);

    // set up the deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx.wait();

    // user info after deposit
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(
      expectedLpTokenAmount
    );
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.be.closeTo(
      expectedEthAmount,
      conversionDelta
    );

    // get delegate address and check if rETH was minted
    delegateAddress = await rocketVaultStorage.getDelegateAddress(user.address);
    expect(await rETH.balanceOf(delegateAddress)).to.equal(expectedLpTokenAmount);

    // fast forward through transfer time restriction
    await hre.network.provider.send("hardhat_mine", ["0x2710"]); // 10000 blocks

    // initiate the lp withdrawal
    tx = await vaultAccounting.connect(user).withdrawLpToken(expectedLpTokenAmount, vaultNames.rocketVault);
    await tx.wait();

    // check user info after lp withdrawal
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(0);
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.empty)).to.equal(0);

    // check delegate address and user address rETH balance after withdrawal
    expect(await rETH.balanceOf(delegateAddress)).to.equal(0);
    expect(await rETH.balanceOf(user.address)).to.equal(expectedLpTokenAmount);
  });

  it("should record additional deposits by same user to same delegate address", async () => {
    // user info prior to deposit
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(0);
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.equal(0);

    // set up the deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx.wait();

    // user info after deposit
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(
      expectedLpTokenAmount
    );
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.be.closeTo(
      expectedEthAmount,
      conversionDelta
    );

    // get delegate address and check if rETH was minted
    delegateAddress = await rocketVaultStorage.getDelegateAddress(user.address);
    expect(await rETH.balanceOf(delegateAddress)).to.equal(expectedLpTokenAmount);

    // set up second deposit
    tx2 = await vaultAccounting.connect(user).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx2.wait();

    expectedEthAmountAfter = await ethers.utils.parseEther("2.0");
    expectedLpTokenAmountAfter = await rocketVault.getAmountLpTokens(expectedEthAmountAfter);

    // user info after deposit
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.be.closeTo(
      expectedLpTokenAmountAfter,
      conversionDelta
    ); // rETH value may have increased
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.be.closeTo(
      expectedEthAmountAfter,
      conversionDelta
    );

    // check delegate address rETH balance
    expect(await rETH.balanceOf(delegateAddress)).to.be.closeTo(expectedLpTokenAmountAfter, conversionDelta);
  });

  it("should create different delegate proxies for different users", async () => {
    // set up first user deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx.wait();

    // get delegate address and check if rETH was minted
    delegateAddress = await rocketVaultStorage.getDelegateAddress(user.address);
    expect(await rETH.balanceOf(delegateAddress)).to.equal(expectedLpTokenAmount);

    // set up second user deposit
    tx2 = await vaultAccounting.connect(user2).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx2.wait();

    delegateAddress2 = await rocketVaultStorage.getDelegateAddress(user2.address);
    expect(await rETH.balanceOf(delegateAddress2)).to.equal(expectedLpTokenAmount);

    expect(delegateAddress).to.not.equal(delegateAddress2);
  });

  it("should allow multiple users to withdraw simultaneously", async () => {
    // set up first user deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx.wait();

    // get delegate address and check if rETH was minted
    delegateAddress = await rocketVaultStorage.getDelegateAddress(user.address);
    expect(await rETH.balanceOf(delegateAddress)).to.equal(expectedLpTokenAmount);

    // set up second user deposit
    tx2 = await vaultAccounting.connect(user2).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx2.wait();

    delegateAddress2 = await rocketVaultStorage.getDelegateAddress(user2.address);
    expect(await rETH.balanceOf(delegateAddress2)).to.equal(expectedLpTokenAmount);

    // fast forward through withdrawal time restriction
    await hre.network.provider.send("hardhat_mine", ["0x2710"]); // 10000 blocks

    // initiate user 2 withdrawal
    withdrawtx = await vaultAccounting.connect(user2).withdraw(expectedLpTokenAmount, vaultNames.rocketVault);
    await withdrawtx.wait();

    // check if user 2 delegate address rETH balance is correct
    expect(await rETH.balanceOf(delegateAddress2)).to.equal(0);

    // initiate user 1 withdrawal
    withdrawtx2 = await vaultAccounting.connect(user).withdraw(expectedLpTokenAmount, vaultNames.rocketVault);

    // check if user 1 delegate address rETH balance is correct
    expect(await rETH.balanceOf(delegateAddress)).to.equal(0);
  });

  it("should allow multiple users to withdraw LP tokens simultaneously", async () => {
    // set up first user deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx.wait();

    // get delegate address and check if rETH was minted
    delegateAddress = await rocketVaultStorage.getDelegateAddress(user.address);
    expect(await rETH.balanceOf(delegateAddress)).to.equal(expectedLpTokenAmount);

    // set up second user deposit
    tx2 = await vaultAccounting.connect(user2).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx2.wait();

    delegateAddress2 = await rocketVaultStorage.getDelegateAddress(user2.address);
    expect(await rETH.balanceOf(delegateAddress2)).to.equal(expectedLpTokenAmount);

    // fast forward through withdrawal time restriction
    await hre.network.provider.send("hardhat_mine", ["0x2710"]); // 10000 blocks

    // set up user 2 LP token withdrawal
    withdrawtx = await vaultAccounting.connect(user2).withdrawLpToken(expectedLpTokenAmount, vaultNames.rocketVault);
    await withdrawtx.wait();

    // check if user 2 delegate address rETH balance is correct
    expect(await rETH.balanceOf(delegateAddress2)).to.equal(0);

    // initiate user 1 withdrawal
    withdrawtx2 = await vaultAccounting.connect(user).withdrawLpToken(expectedLpTokenAmount, vaultNames.rocketVault);

    // check if user 1 delegate address rETH balance is correct
    expect(await rETH.balanceOf(delegateAddress)).to.equal(0);
  });

  it("should fail to deposit directly to delegate contract", async () => {
    // set up initial deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx.wait();

    // get delegate address and check if rETH was minted
    delegateAddress = await rocketVaultStorage.getDelegateAddress(user.address);
    expect(await rETH.balanceOf(delegateAddress)).to.equal(expectedLpTokenAmount);

    // retrive delegate contract
    delegateProxy = await ethers.getContractAt("RocketPoolDelegate", delegateAddress);

    await expect(delegateProxy.connect(user).deposit({ value: depositAmount })).to.be.revertedWith(
      "Only the current implementation can call function"
    );
  });

  it("should fail to withdraw directly from delegate contract", async () => {
    // set up initial deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx.wait();

    // get delegate address and check if rETH was minted
    delegateAddress = await rocketVaultStorage.getDelegateAddress(user.address);
    expect(await rETH.balanceOf(delegateAddress)).to.equal(expectedLpTokenAmount);

    // retrive delegate contract
    delegateProxy = await ethers.getContractAt("RocketPoolDelegate", delegateAddress);

    await expect(delegateProxy.connect(user).withdraw(depositAmount, user.address)).to.be.revertedWith(
      "Only the current implementation can call function"
    );
  });

  it("should fail to deposit LP tokens directly to delegate contract", async () => {
    // set up initial deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx.wait();

    // get delegate address and check if rETH was minted
    delegateAddress = await rocketVaultStorage.getDelegateAddress(user.address);
    expect(await rETH.balanceOf(delegateAddress)).to.equal(expectedLpTokenAmount);

    // deposit directly with rocketpool
    tx = await depositPool.connect(user).deposit({ value: depositAmount });
    await tx.wait();

    // fast forward through transfer time restriction
    await hre.network.provider.send("hardhat_mine", ["0x2710"]); // 10000 blocks

    // retrive delegate contract
    delegateProxy = await ethers.getContractAt("RocketPoolDelegate", delegateAddress);

    // approve rETH to delegate contract
    approvetx = await rETH.connect(user).approve(delegateProxy.address, expectedLpTokenAmount);
    await approvetx.wait();

    await expect(delegateProxy.connect(user).depositLpToken(expectedLpTokenAmount, user.address)).to.be.revertedWith(
      "Only the current implementation can call function"
    );
  });

  it("should fail to withdraw LP tokens directly from delegate contract", async () => {
    // set up initial deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx.wait();

    // get delegate address and check if rETH was minted
    delegateAddress = await rocketVaultStorage.getDelegateAddress(user.address);
    expect(await rETH.balanceOf(delegateAddress)).to.equal(expectedLpTokenAmount);

    // fast forward through transfer time restriction
    await hre.network.provider.send("hardhat_mine", ["0x2710"]); // 10000 blocks

    // retrive delegate contract
    delegateProxy = await ethers.getContractAt("RocketPoolDelegate", delegateAddress);

    await expect(delegateProxy.connect(user).withdrawLpToken(expectedLpTokenAmount, user.address)).to.be.revertedWith(
      "Only the current implementation can call function"
    );
  });

  it("should fail to upgrade current implementation without passing through diamond", async () => {
    await expect(rocketVault.connect(user).transferFunds(user.address)).to.be.revertedWith(
      "Only diamond can call function"
    );
  });

  it("should fail to upgrade current implementation in vault storage if not owner", async () => {
    newVault = "0x283Af0B28c62C092C9727F1Ee09c02CA627EB7F5"; // random address
    await expect(rocketVaultStorage.connect(user).transferOwnership(newVault)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("should fail to set delegate address if not current implementation", async () => {
    // set up initial deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx.wait();

    // get delegate address and check if rETH was minted
    delegateAddress = await rocketVaultStorage.getDelegateAddress(user.address);
    expect(await rETH.balanceOf(delegateAddress)).to.equal(expectedLpTokenAmount);

    // should fail if user2 tries to take user's delegate address
    await expect(
      rocketVaultStorage.connect(user2).setDelegateAddress(user2.address, delegateAddress)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should fail to deposit directly without passing through diamond", async () => {
    await expect(rocketVault.connect(user).deposit(userAddressData, { value: depositAmount })).to.be.revertedWith(
      "Only diamond can call function"
    );
  });

  it("should fail to withdraw directly without passing through diamond", async () => {
    // set up initial deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx.wait();

    // get delegate address and check if rETH was minted
    delegateAddress = await rocketVaultStorage.getDelegateAddress(user.address);
    expect(await rETH.balanceOf(delegateAddress)).to.equal(expectedLpTokenAmount);

    // fast forward through transfer time restriction
    await hre.network.provider.send("hardhat_mine", ["0x2710"]); // 10000 blocks

    await expect(rocketVault.connect(user).withdraw(depositAmount, user.address, userAddressData)).to.be.revertedWith(
      "Only diamond can call function"
    );
  });

  it("should fail to deposit LP tokens directly without passing through diamond", async () => {
    // deposit directly with rocketpool
    tx = await depositPool.connect(user).deposit({ value: depositAmount });
    await tx.wait();

    // fast forward through transfer time restriction
    await hre.network.provider.send("hardhat_mine", ["0x2710"]); // 10000 blocks

    await expect(
      rocketVault.connect(user).depositLpToken(expectedLpTokenAmount, user.address, userAddressData)
    ).to.be.revertedWith("Only diamond can call function");
  });

  it("should fail to withdraw LP tokens directly without passing through diamond", async () => {
    // set up initial deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx.wait();

    // get delegate address and check if rETH was minted
    delegateAddress = await rocketVaultStorage.getDelegateAddress(user.address);
    expect(await rETH.balanceOf(delegateAddress)).to.equal(expectedLpTokenAmount);

    // fast forward through transfer time restriction
    await hre.network.provider.send("hardhat_mine", ["0x2710"]); // 10000 blocks

    await expect(
      rocketVault.connect(user).withdrawLpToken(expectedLpToken, user.address, userAddressData)
    ).to.be.revertedWith("Only diamond can call function");
  });
});
