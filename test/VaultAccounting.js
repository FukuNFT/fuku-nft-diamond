const { ethers } = require("hardhat");
const { expect } = require("chai");

const { fixture } = require("./fixture");

describe("Vault Accounting", async () => {
  // fixture values
  let deployer, user;
  let vaultAccounting;
  let vaultManagement;
  let vaultNames;

  // vault parameters
  let emptyVault;
  let amount;
  let expectedLpTokens;

  beforeEach(async () => {
    // initialize fixture values
    ({ vaultAccounting, vaultManagement, vaultNames } = await fixture());
    [deployer, user] = await ethers.getSigners();

    // initialize vault parameters
    emptyVault = await ethers.getContractAt("IVault", await vaultManagement.getVault(vaultNames.empty));
    amount = ethers.utils.parseEther("1.0");
    expectedLpTokens = await emptyVault.convertEthToShares(amount);
  });

  it("should successfully return user vault balance after deposit", async () => {
    // user balance should change
    await expect(
      await vaultAccounting.connect(user).deposit(vaultNames.empty, { value: amount })
    ).to.changeEtherBalance(user, amount.mul(-1));
    // user balance should be reflected
    expect(await vaultAccounting.userVaultTokenBalance(user.address, vaultNames.empty)).to.equal(expectedLpTokens);
  });

  it("should successfully emit event from deposit", async () => {
    // listen to event
    await expect(vaultAccounting.connect(user).deposit(vaultNames.empty, { value: amount }))
      .to.emit(vaultAccounting, "DepositEth")
      .withArgs(user.address, vaultNames.empty, amount, expectedLpTokens);
  });

  it.skip("should fail to deposit into vault directly", async () => {
    await expect(emptyVault.deposit({ value: amount })).to.be.revertedWith("Only diamond can call function");
  });

  it("should fail to deposit into non-existent vault", async () => {
    const badVault = "0xeeeeeeeeeeeeeeeeeeeeeeef";

    await expect(vaultAccounting.connect(user).deposit(badVault, { value: amount })).to.be.revertedWith(
      "Vault does not exist"
    );
  });

  it("should successfully withdraw from vault", async () => {
    // start by depositing
    tx = await vaultAccounting.connect(user).deposit(vaultNames.empty, { value: amount });
    await tx.wait();
    const userBalance = await vaultAccounting.userVaultTokenBalance(user.address, vaultNames.empty);
    expect(userBalance).to.be.gt(0);

    // withdraw
    await expect(await vaultAccounting.connect(user).withdraw(userBalance, vaultNames.empty)).to.changeEtherBalance(
      user,
      amount
    );
    // user balance should be reflected
    expect(await vaultAccounting.userVaultTokenBalance(user.address, vaultNames.empty)).to.equal(0);
  });

  it("should successfully emit event from withdraw", async () => {
    // start by depositing
    tx = await vaultAccounting.connect(user).deposit(vaultNames.empty, { value: amount });
    await tx.wait();
    const userBalance = await vaultAccounting.userVaultTokenBalance(user.address, vaultNames.empty);
    expect(userBalance).to.be.gt(0);

    // listen to event
    await expect(vaultAccounting.connect(user).withdraw(userBalance, vaultNames.empty))
      .to.emit(vaultAccounting, "Withdraw")
      .withArgs(user.address, vaultNames.empty, amount, userBalance);
  });

  it("should fail to withdraw from non-existent vault", async () => {
    const badVault = "0xeeeeeeeeeeeeeeeeeeeeeeef";

    await expect(vaultAccounting.connect(user).withdraw(amount, badVault)).to.be.revertedWith("Vault does not exist");
  });

  it("should fail to withdraw more than user balance", async () => {
    // start by depositing
    tx = await vaultAccounting.connect(user).deposit(vaultNames.empty, { value: amount });
    await tx.wait();
    const userBalance = await vaultAccounting.userVaultTokenBalance(user.address, vaultNames.empty);
    expect(userBalance).to.be.gt(0);

    // attempt to withdraw
    await expect(vaultAccounting.connect(user).withdraw(userBalance.add(1), vaultNames.empty)).to.be.revertedWith(
      "Insufficient token balance"
    );
  });
});
