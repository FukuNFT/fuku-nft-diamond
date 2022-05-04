const { ethers } = require("hardhat");
const { expect } = require("chai");

const { fixture } = require("../fixture");

describe("Rocket Vault", async () => {
  // fixture values
  let deployer, user;
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

  // slippage upon getAmountEth conversion
  const conversionDelta = ethers.utils.parseEther("0.00000001");

  beforeEach(async () => {
    // initialize fixture values
    ({ vaultAccounting, vaultManagement, vaultNames } = await fixture());
    [deployer, user] = await ethers.getSigners();

    // initialize vault parameters
    depositAmount = ethers.utils.parseEther("1.0");
    expectedEthAmount = ethers.utils.parseEther("1.0");
    expectedLpToken = "0xae78736Cd615f374D3085123A210448E74Fc6393"; // rETH token address
    rocketVault = await ethers.getContractAt("IVault", await vaultManagement.getVault(vaultNames.rocketVault));
    expectedLpTokenAmount = await rocketVault.getAmountLpTokens(depositAmount); //gets rETH amount equivalent to 1 ETH
    rETH = await ethers.getContractAt("RocketTokenRETHInterface", expectedLpToken);

    // impersonate user and redeem rETH to make room for testing
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x7Fe2547Bcb8FCE1D51f2A2C0d9D93174Cd05b3f9"],
    });
    const signer = await ethers.getSigner("0x7Fe2547Bcb8FCE1D51f2A2C0d9D93174Cd05b3f9");

    const burnAmount = ethers.utils.parseUnits("5.0"); // 5 rETH

    const approvetx = await rETH.connect(signer).approve(rETH.address, burnAmount);
    await approvetx.wait();

    const burntx = await rETH.connect(signer).burn(burnAmount);
    await burntx.wait();
  });

  it("Should reflect correct conversion from lp tokens to ETH", async () => {
    expect(await rocketVault.getAmountETH(expectedLpTokenAmount)).to.be.closeTo(expectedEthAmount, conversionDelta);
  });

  it("Should reflect correct conversion from ETH to lp tokens", async () => {
    expect(await rocketVault.getAmountLpTokens(expectedEthAmount)).to.be.equal(expectedLpTokenAmount);
  });

  it("Should return the correct lp token", async () => {
    expect(await rocketVault.getLpToken()).to.equal(expectedLpToken);
  });

  it("Should deposit specified amount and reflect correct balance", async () => {
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
    expect(await rETH.balanceOf(rocketVault.address)).to.equal(expectedLpTokenAmount);
  });

  it("Should withdraw specified amount and reflect correct balance", async () => {
    // set up the deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx.wait();

    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(
      expectedLpTokenAmount
    );
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.be.closeTo(
      expectedEthAmount,
      conversionDelta
    );

    expect(await rETH.balanceOf(rocketVault.address)).to.equal(expectedLpTokenAmount);

    // fast forward through withdrawal time restriction
    await hre.network.provider.send("hardhat_mine", ["0x2710"]); // 10000 blocks

    // initial withdrawal
    tx = await vaultAccounting.connect(user).withdraw(expectedLpTokenAmount, vaultNames.rocketVault);
    await tx.wait();

    // user info after withdrawal
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(0);
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.empty)).to.equal(0);
    expect(await rETH.balanceOf(rocketVault.address)).to.equal(0);
  });

  it("Should transfer funds to new vault", async () => {
    // set up the deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx.wait();

    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(
      expectedLpTokenAmount
    );
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.be.closeTo(
      expectedEthAmount,
      conversionDelta
    );
    expect(await rETH.balanceOf(rocketVault.address)).to.equal(expectedLpTokenAmount);

    // deploy new vault
    const EmptyVault = await ethers.getContractFactory("EmptyVault");
    const newEmptyVault = await EmptyVault.deploy(vaultManagement.address);
    await newEmptyVault.deployed();

    // fast forward through withdrawal time restriction
    await hre.network.provider.send("hardhat_mine", ["0x2710"]); // 10000 blocks

    // upgrade vault
    tx = await vaultManagement.upgradeVault(vaultNames.rocketVault, newEmptyVault.address);
    await tx.wait();

    //verify old vault is empty
    expect(await rETH.balanceOf(rocketVault.address)).to.equal(0);

    //verify new vault balance
    expect(await ethers.provider.getBalance(newEmptyVault.address)).to.be.closeTo(expectedEthAmount, conversionDelta);

    // verify user balance has not changed
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(
      expectedLpTokenAmount
    );
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.be.lte(expectedEthAmount);
  });

  it("Should allow LP token deposits", async () => {
    const depositPoolAddress = "0x4D05E3d48a938db4b7a9A59A802D5b45011BDe58";
    const depositPool = await ethers.getContractAt("RocketDepositPoolInterface", depositPoolAddress);

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

    expect(await rETH.balanceOf(rocketVault.address)).to.equal(expectedLpTokenAmount);
  });

  it("Should allow LP token withdrawals", async () => {
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(0);
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.equal(0);

    // set up the deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx.wait();

    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(
      expectedLpTokenAmount
    );
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.be.lte(expectedEthAmount); //tiny slippage

    expect(await rETH.balanceOf(rocketVault.address)).to.equal(expectedLpTokenAmount);

    // fast forward through transfer time restriction
    await hre.network.provider.send("hardhat_mine", ["0x2710"]); // 10000 blocks

    // initiate the lp withdrawal
    tx = await vaultAccounting.connect(user).withdrawLpToken(expectedLpTokenAmount, vaultNames.rocketVault);
    await tx.wait();

    // check user info after lp withdrawal
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(0);
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.empty)).to.equal(0);

    expect(await rETH.balanceOf(rocketVault.address)).to.equal(0);
    expect(await rETH.balanceOf(user.address)).to.equal(expectedLpTokenAmount);
  });

  it("should fail to deposit without passing through diamond", async () => {
    await expect(rocketVault.connect(user).deposit({ value: depositAmount })).to.be.revertedWith(
      "Only diamond can call function"
    );
  });

  it("should fail to withdraw without passing through diamond", async () => {
    await expect(rocketVault.connect(user).withdraw(depositAmount, user.address)).to.be.revertedWith(
      "Only diamond can call function"
    );
  });

  it("should fail to transfer funds without passing through diamond", async () => {
    await expect(rocketVault.connect(user).transferFunds(user.address)).to.be.revertedWith(
      "Only diamond can call function"
    );
  });

  it("Should fail to deposit LP tokens without passing through diamond", async () => {
    const depositPoolAddress = "0x4D05E3d48a938db4b7a9A59A802D5b45011BDe58";
    const depositPool = await ethers.getContractAt("RocketDepositPoolInterface", depositPoolAddress);

    // set up the deposit
    tx = await depositPool.connect(user).deposit({ value: depositAmount });
    await tx.wait();

    // fast forward through transfer time restriction
    await hre.network.provider.send("hardhat_mine", ["0x2710"]); // 10000 blocks

    // approve rETH to vault
    approvetx = await rETH.connect(user).approve(rocketVault.address, expectedLpTokenAmount);
    await approvetx.wait();

    await expect(rocketVault.connect(user).depositLpToken(expectedLpTokenAmount, user.address)).to.be.revertedWith(
      "Only diamond can call function"
    );
  });

  it("Should fail to withdraw LP tokens without passing through diamond", async () => {
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(0);
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.equal(0);

    // set up the deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.rocketVault, { value: depositAmount });
    await tx.wait();

    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.rocketVault)).to.equal(
      expectedLpTokenAmount
    );
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.rocketVault)).to.be.lte(expectedEthAmount); //tiny slippage

    expect(await rETH.balanceOf(rocketVault.address)).to.equal(expectedLpTokenAmount);

    // fast forward through transfer time restriction
    await hre.network.provider.send("hardhat_mine", ["0x2710"]); // 10000 blocks

    await expect(rocketVault.connect(user).withdrawLpToken(expectedLpTokenAmount, user.address)).to.be.revertedWith(
      "Only diamond can call function"
    );
  });
});
