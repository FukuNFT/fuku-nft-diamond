const { ethers } = require("hardhat");
const { expect } = require("chai");

const { fixture } = require("./fixture");

describe("Rewards Management", async () => {
  // fixture values
  let deployer, user;
  let rewardsManagement;

  // rewards management parameters
  let epochDuration;

  beforeEach(async () => {
    // initializing fixture values
    ({ rewardsManagement } = await fixture());
    [deployer, user] = await ethers.getSigners();

    // initializing rewards management parameters
    epochDuration = 604800; // 1 week
  });

  describe("Setting epoch parameters", async () => {
    it("should emit an event when setting the epoch duration", async () => {
      await expect(await rewardsManagement.setEpochDuration(epochDuration))
        .to.emit(rewardsManagement, "EpochDurationSet")
        .withArgs(epochDuration);
    });

    it("should fail to set the epoch duration when not diamond owner", async () => {
      await expect(rewardsManagement.connect(user).setEpochDuration(epochDuration)).to.be.revertedWith(
        "LibDiamond: Must be contract owner"
      );
    });
  });

  describe("Starting epoch", async () => {
    it("should emit an event when starting the epoch", async () => {
      // need to set the duration before starting
      tx = await rewardsManagement.setEpochDuration(epochDuration);
      await tx.wait();

      await expect(await rewardsManagement.startEpoch())
        .to.emit(rewardsManagement, "EpochStarted")
        .withArgs(0, (await ethers.provider.getBlock("latest")).timestamp + epochDuration);
    });

    it("should successfully start next epoch after first epoch ended", async () => {
      // need to set the duration before starting
      tx = await rewardsManagement.setEpochDuration(epochDuration);
      await tx.wait();

      // start it the first time
      tx = await rewardsManagement.startEpoch();
      await tx.wait();

      // advance time past expiry
      await ethers.provider.send("evm_increaseTime", [epochDuration + 1]);

      await expect(await rewardsManagement.startEpoch())
        .to.emit(rewardsManagement, "EpochStarted")
        .withArgs(1, (await ethers.provider.getBlock("latest")).timestamp + epochDuration);
    });

    it("should fail to start an epoch before epoch end", async () => {
      // need to set the duration before starting
      tx = await rewardsManagement.setEpochDuration(epochDuration);
      await tx.wait();

      // start it the first time
      tx = await rewardsManagement.startEpoch();
      await tx.wait();

      await expect(rewardsManagement.startEpoch()).to.be.revertedWith("Epoch has not ended");
    });

    it("should fail to start an epoch if duration has not been set", async () => {
      await expect(rewardsManagement.startEpoch()).to.be.revertedWith("Epoch duration not set");
    });
  });
});
