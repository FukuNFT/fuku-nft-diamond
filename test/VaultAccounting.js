const { ethers } = require("hardhat");
const { expect } = require("chai");

const { fixture } = require("./fixture");

describe("Vault Accounting", async () => {
  // fixture values
  let deployer, user;
  let vaultAccounting;
  let vaultManagement;
  let vaultNames;
  let fukuToken;

  // vault parameters
  let emptyVault;
  let amount;
  let expectedLpTokens;
  let rewardsDuration;
  let rewardsAmount;

  beforeEach(async () => {
    // initialize fixture values
    ({ vaultAccounting, vaultManagement, vaultNames, fukuToken } = await fixture());
    [deployer, user] = await ethers.getSigners();

    // initialize vault parameters
    emptyVault = await ethers.getContractAt("IVault", await vaultManagement.getVault(vaultNames.empty));
    amount = ethers.utils.parseEther("2.0");
    expectedLpTokens = await emptyVault.getAmountLpTokens(amount);
    rewardsDuration = 604800; // 1 week
    rewardsAmount = ethers.utils.parseEther("100.0");
  });

  it("should successfully return user vault balance after deposit", async () => {
    // user balance should change
    await expect(
      await vaultAccounting.connect(user).deposit(vaultNames.empty, { value: amount })
    ).to.changeEtherBalance(user, amount.mul(-1));
    // user balance should be reflected
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.empty)).to.equal(expectedLpTokens);
  });

  it("should successfully emit event from deposit", async () => {
    // listen to event
    await expect(vaultAccounting.connect(user).deposit(vaultNames.empty, { value: amount }))
      .to.emit(vaultAccounting, "DepositEth")
      .withArgs(user.address, vaultNames.empty, amount, expectedLpTokens);
  });

  it("should fail to deposit into vault directly", async () => {
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
    const userBalance = await vaultAccounting.userLPTokenBalance(user.address, vaultNames.empty);
    expect(userBalance).to.be.gt(0);

    // withdraw
    await expect(await vaultAccounting.connect(user).withdraw(userBalance, vaultNames.empty)).to.changeEtherBalance(
      user,
      amount
    );
    // user balance should be reflected
    expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.empty)).to.equal(0);
  });

  it("should successfully emit event from withdraw", async () => {
    // start by depositing
    tx = await vaultAccounting.connect(user).deposit(vaultNames.empty, { value: amount });
    await tx.wait();
    const userBalance = await vaultAccounting.userLPTokenBalance(user.address, vaultNames.empty);
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
    const userBalance = await vaultAccounting.userLPTokenBalance(user.address, vaultNames.empty);
    expect(userBalance).to.be.gt(0);

    // attempt to withdraw
    await expect(vaultAccounting.connect(user).withdraw(userBalance.add(1), vaultNames.empty)).to.be.revertedWith(
      "Insufficient token balance"
    );
  });

  it("should successfully emit an event when setting rewards duration", async () => {
    await expect(vaultAccounting.setRewardsDuration(vaultNames.empty, rewardsDuration))
      .to.emit(vaultAccounting, "RewardsDurationUpdated")
      .withArgs(vaultNames.empty, rewardsDuration);
  });

  it("should successfully emit an event when setting rewards amount", async () => {
    // set the rewards duration
    tx = await vaultAccounting.setRewardsDuration(vaultNames.empty, rewardsDuration);
    await tx.wait();

    await expect(vaultAccounting.notifyRewardAmount(vaultNames.empty, rewardsAmount))
      .to.emit(vaultAccounting, "RewardAdded")
      .withArgs(vaultNames.empty, rewardsAmount);
  });

  it("should fail to set rewards duration before previous period has ended", async () => {
    // set the rewards duration
    tx = await vaultAccounting.setRewardsDuration(vaultNames.empty, rewardsDuration);
    await tx.wait();

    // set the rewards amount
    tx = await vaultAccounting.notifyRewardAmount(vaultNames.empty, rewardsAmount);
    await tx.wait();

    await expect(vaultAccounting.setRewardsDuration(vaultNames.empty, rewardsDuration)).to.be.revertedWith(
      "Previous rewards period not ended"
    );
  });

  it("should fail to set rewards duration if not diamond owner", async () => {
    await expect(
      vaultAccounting.connect(user).setRewardsDuration(vaultNames.empty, rewardsDuration)
    ).to.be.revertedWith("LibDiamond: Must be contract owner");
  });

  it("should fail to set rewards amount if not diamond owner", async () => {
    await expect(vaultAccounting.connect(user).notifyRewardAmount(vaultNames.empty, rewardsAmount)).to.be.revertedWith(
      "LibDiamond: Must be contract owner"
    );
  });

  describe("Deposits Rewards", async () => {
    beforeEach(async () => {
      // deposit
      tx = await vaultAccounting.connect(user).deposit(vaultNames.empty, { value: amount });
      await tx.wait();

      // set the rewards duration
      tx = await vaultAccounting.setRewardsDuration(vaultNames.empty, rewardsDuration);
      await tx.wait();

      // set the rewards amount
      tx = await vaultAccounting.notifyRewardAmount(vaultNames.empty, rewardsAmount);
      await tx.wait();

      // advance time by a day
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine");
    });

    it("should earn rewards at the current reward rate", async () => {
      const rewardPerToken = await vaultAccounting.rewardPerToken(vaultNames.empty);

      const earned = await vaultAccounting.earned(vaultNames.empty, user.address);
      expect(earned).to.equal(rewardPerToken.mul(amount).div(ethers.utils.parseEther("1.0")));
    });

    it("should successfully claim rewards", async () => {
      const earned = await vaultAccounting.earned(vaultNames.empty, user.address);
      const balBefore = await fukuToken.balanceOf(user.address);

      // claim
      tx = await vaultAccounting.connect(user).getReward(vaultNames.empty);
      await tx.wait();

      const balAfter = await fukuToken.balanceOf(user.address);

      expect(balAfter).to.be.closeTo(balBefore.add(earned), ethers.utils.parseEther("0.001"));
    });

    it("should stop earning rewards after withdrawing funds", async () => {
      // withdraw
      tx = await vaultAccounting.connect(user).withdraw(amount, vaultNames.empty);
      await tx.wait();

      // claim
      tx = await vaultAccounting.connect(user).getReward(vaultNames.empty);
      await tx.wait();

      // fast forward a day
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine");

      const earned = await vaultAccounting.earned(vaultNames.empty, user.address);
      expect(earned).to.equal(0);
    });

    it("should stop earning rewards after the rewards period has ended", async () => {
      // fast forward a the rewards period
      await ethers.provider.send("evm_increaseTime", [rewardsDuration]);
      await ethers.provider.send("evm_mine");

      // claim
      tx = await vaultAccounting.connect(user).getReward(vaultNames.empty);
      await tx.wait();

      // fast forward a day
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine");

      const earned = await vaultAccounting.earned(vaultNames.empty, user.address);
      expect(earned).to.equal(0);
    });

    it("should allow for multiple users to earn rewards", async () => {
      // deposit
      tx = await vaultAccounting.connect(deployer).deposit(vaultNames.empty, { value: amount });
      await tx.wait();

      // fast forward a day
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine");

      const earnedDeployer = await vaultAccounting.earned(vaultNames.empty, deployer.address);
      const earnedUser = await vaultAccounting.earned(vaultNames.empty, user.address);
      expect(earnedDeployer).to.be.gt(0);
      expect(earnedUser).to.be.gt(0);
    });
  });
});
