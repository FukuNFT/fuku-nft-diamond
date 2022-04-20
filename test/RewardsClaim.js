const { ethers } = require("hardhat");
const { expect } = require("chai");

const { fixture } = require("./fixture");

describe("Rewards Claim", async () => {
  // fixture values
  let deployer, user;
  let rewardsClaim;
  let rewardsManagement;
  let vaultAccounting;
  let bidMarket;
  let testERC721;
  let vaultNames;
  let fukuToken;

  // rewards parameters
  let currentEpoch;
  let epochDuration;
  let expectedRewards;
  let bidAmount;
  let nftId;

  beforeEach(async () => {
    // initialize fixture values
    ({ rewardsClaim, rewardsManagement, bidMarket, vaultAccounting, testERC721, vaultNames, fukuToken } =
      await fixture());
    [deployer, user, user2] = await ethers.getSigners();
    rewardsClaim = rewardsClaim.connect(user);

    // initialize rewards parameters
    currentEpoch = 0;
    epochDuration = 604800; // 1 week
    bidAmount = ethers.utils.parseEther("2.0");
    nftId = 0;

    // set up the rewards management
    tx = await rewardsManagement.setEpochDuration(epochDuration);
    await tx.wait();
    tx = await rewardsManagement.startEpoch();
    await tx.wait();

    // deposit into vault
    tx = await vaultAccounting.connect(user).deposit(vaultNames.empty, { value: ethers.utils.parseEther("10.0") });
    await tx.wait();
  });

  it("should fail to claim rewards if epoch has not started", async () => {
    await expect(rewardsClaim.claimRewards(1)).to.be.revertedWith("Epoch not started");
  });

  it("should fail to claim rewards if epoch has not ended", async () => {
    // advance time past expiry
    await ethers.provider.send("evm_increaseTime", [epochDuration + 1]);

    // start a new epoch
    tx = await rewardsManagement.startEpoch();
    await tx.wait();

    await expect(rewardsClaim.claimRewards(1)).to.be.revertedWith("Epoch not ended");
  });

  it("should fail to claim rewards if user has none", async () => {
    // advance time past expiry
    await ethers.provider.send("evm_increaseTime", [epochDuration + 1]);

    await expect(rewardsClaim.connect(deployer).claimRewards(currentEpoch)).to.be.revertedWith("User has no rewards");
  });
});
