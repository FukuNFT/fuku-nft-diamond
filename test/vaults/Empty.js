const { ethers } = require("hardhat");
const { expect } = require("chai");

const { fixture } = require("../fixture");

describe("Empty Vault", async () => {
  // fixture values
  let deployer, user;
  let vaultAccounting;
  let vaultManagement;
  let vaultNames;

  // vault parameters
  let depositAmount;
  let expectedEthAmount;
  let expectedLpTokenAmount;
  let emptyVault;

  beforeEach(async () => {
    // initialize fixture values
    ({ vaultAccounting, vaultManagement, vaultNames } = await fixture());
    [deployer, user] = await ethers.getSigners();

    // initialize vault parameters
    depositAmount = ethers.utils.parseEther("1.0");
    expectedEthAmount = ethers.utils.parseEther("1.0");
    expectedLpTokenAmount = ethers.utils.parseEther("1.0");
    expectedLpToken = "0x0000000000000000000000000000000000000000";
    emptyVault = await ethers.getContractAt("IVault", await vaultManagement.getVault(vaultNames.empty));
  });

  it("should reflect correct conversion from ETH to lp tokens", async () => {
    expect(await emptyVault.getAmountETH(expectedLpTokenAmount)).to.equal(expectedEthAmount);
  });

  it("should reflect correct conversion from lp tokens to ETH", async () => {
    expect(await emptyVault.getAmountLpTokens(expectedEthAmount)).to.equal(expectedLpTokenAmount);
  });

  it("should return the correct lp token", async () => {
    expect(await emptyVault.getLpToken()).to.equal(expectedLpToken);
  });

  it("should deposit specified amount and reflect correct balance", async () => {
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.empty)).to.equal(0);
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.empty)).to.equal(0);

    tx = await vaultAccounting.connect(user).deposit(vaultNames.empty, { value: depositAmount });
    await tx.wait();

    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.empty)).to.equal(expectedLpTokenAmount);
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.empty)).to.equal(expectedEthAmount);

    expect(await ethers.provider.getBalance(emptyVault.address)).to.equal(depositAmount);
  });

  it("should withdraw specified amount and reflect correct balance", async () => {
    // set up the deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.empty, { value: depositAmount });
    await tx.wait();

    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.empty)).to.equal(expectedLpTokenAmount);
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.empty)).to.equal(expectedEthAmount);

    expect(await ethers.provider.getBalance(emptyVault.address)).to.equal(depositAmount);

    // withdraw
    tx = await vaultAccounting.connect(user).withdraw(depositAmount, vaultNames.empty);
    await tx.wait();

    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.empty)).to.equal(0);
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.empty)).to.equal(0);

    expect(await ethers.provider.getBalance(emptyVault.address)).to.equal(0);
  });

  it("should transfer funds to new vault", async () => {
    // make a deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.empty, { value: depositAmount });
    await tx.wait();

    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.empty)).to.equal(expectedLpTokenAmount);
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.empty)).to.equal(expectedEthAmount);

    expect(await ethers.provider.getBalance(emptyVault.address)).to.equal(depositAmount);

    // deploy new vault
    const EmptyVault = await ethers.getContractFactory("EmptyVault");
    const newEmptyVault = await EmptyVault.deploy(vaultManagement.address);
    await newEmptyVault.deployed();

    // upgrade vault
    tx = await vaultManagement.upgradeVault(vaultNames.empty, newEmptyVault.address);
    await tx.wait();

    // verify old vault is now empty
    expect(await ethers.provider.getBalance(emptyVault.address)).to.equal(0);

    // verify user balance has not changed
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.empty)).to.equal(expectedLpTokenAmount);
    expect(await vaultAccounting.userETHBalance(user.address, vaultNames.empty)).to.equal(expectedEthAmount);

    // verify new vault contains funds
    expect(await ethers.provider.getBalance(newEmptyVault.address)).to.equal(depositAmount);
  });

  it("should fail to deposit without passing through diamond", async () => {
    await expect(emptyVault.connect(user).deposit({ value: depositAmount })).to.be.revertedWith(
      "Only diamond can call function"
    );
  });

  it("should fail to withdraw without passing through diamond", async () => {
    await expect(emptyVault.connect(user).withdraw(depositAmount, user.address)).to.be.revertedWith(
      "Only diamond can call function"
    );
  });

  it("should fail to transfer funds without passing through diamond", async () => {
    await expect(emptyVault.connect(user).transferFunds(user.address)).to.be.revertedWith(
      "Only diamond can call function"
    );
  });

  it("should fail to deposit lp token", async () => {
    await expect(vaultAccounting.connect(user).depositLpToken(vaultNames.empty, depositAmount)).to.be.revertedWith(
      "Disabled."
    );
  });

  it("should fail to withdraw lp token", async () => {
    // make a deposit
    tx = await vaultAccounting.connect(user).deposit(vaultNames.empty, { value: depositAmount });
    await tx.wait();

    await expect(vaultAccounting.connect(user).withdrawLpToken(depositAmount, vaultNames.empty)).to.be.revertedWith(
      "Disabled."
    );
  });
});
