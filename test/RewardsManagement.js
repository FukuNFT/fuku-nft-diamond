const { ethers } = require("hardhat");
const { expect } = require("chai");

const { fixture } = require("./fixture");

describe("Rewards Management", async () => {
  // fixture values
  let deployer, user;
  let rewardsManagement;
  let cryptoPunks;
  let testERC721;

  // rewards management parameters
  let epochDuration;
  let collection;
  let collectionAllocation;
  let depositsAllocation;
  let salesAllocation;
  let salesSplit;

  beforeEach(async () => {
    // initializing fixture values
    ({ rewardsManagement, testERC721, cryptoPunks } = await fixture());
    [deployer, user] = await ethers.getSigners();

    // initializing rewards management parameters
    epochDuration = 604800; // 1 week
    collection = testERC721.address;
    collectionAllocation = ethers.utils.parseEther("15.0");
    collectionFloorPrice = ethers.utils.parseEther("1.0");
    depositsAllocation = ethers.utils.parseEther("10.0");
    salesAllocation = ethers.utils.parseEther("5.0");
    salesSplit = 5000;
  });

  describe("Setting epoch parameters", async () => {
    it("should emit an event when allocating the collection rewards", async () => {
      await expect(
        await rewardsManagement.setCollectionAllocation(collection, collectionAllocation, collectionFloorPrice)
      )
        .to.emit(rewardsManagement, "CollectionAllocated")
        .withArgs(0, collection, collectionAllocation);
    });

    it("should emit an event when allocating the deposits rewards", async () => {
      await expect(await rewardsManagement.setDepositsAllocation(depositsAllocation))
        .to.emit(rewardsManagement, "DepositsAllocated")
        .withArgs(0, depositsAllocation);
    });

    it("should emit an event when allocating the sales rewards", async () => {
      await expect(await rewardsManagement.setSalesAllocation(salesAllocation))
        .to.emit(rewardsManagement, "SalesAllocated")
        .withArgs(0, salesAllocation);
    });

    it("should emit an event wehn allocating the sales split", async () => {
      await expect(await rewardsManagement.setSalesSplit(salesSplit))
        .to.emit(rewardsManagement, "SalesShareSet")
        .withArgs(salesSplit);
    });

    it("should emit an event when setting the epoch duration", async () => {
      await expect(await rewardsManagement.setEpochDuration(epochDuration))
        .to.emit(rewardsManagement, "EpochDurationSet")
        .withArgs(epochDuration);
    });

    it("should fail to set collection rewards when not diamond owner", async () => {
      await expect(
        rewardsManagement.connect(user).setCollectionAllocation(collection, collectionAllocation, collectionFloorPrice)
      ).to.be.revertedWith("LibDiamond: Must be contract owner");
    });

    it("should fail to set deposits rewards when not diamond owner", async () => {
      await expect(rewardsManagement.connect(user).setDepositsAllocation(depositsAllocation)).to.be.revertedWith(
        "LibDiamond: Must be contract owner"
      );
    });

    it("should fail to set sales rewards when not diamond owner", async () => {
      await expect(rewardsManagement.connect(user).setSalesAllocation(salesAllocation)).to.be.revertedWith(
        "LibDiamond: Must be contract owner"
      );
    });

    it("should fail to set sales split when not diamond owner", async () => {
      await expect(rewardsManagement.connect(user).setSalesSplit(salesSplit)).to.be.revertedWith(
        "LibDiamond: Must be contract owner"
      );
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
