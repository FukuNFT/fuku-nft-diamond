const hre = require("hardhat");
const { expect } = require("chai");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const { fixture } = require("./fixture");

describe("Rewards Management", async () => {
  // fixture values
  let deployer, user;
  let rewardsManagement;

  // rewards management parameters
  let epochDuration;
  let epochRewards;
  let rewardAddressAndAmount;
  let rootHash;
  let userProof;

  beforeEach(async () => {
    // initializing fixture values
    ({ rewardsManagement } = await fixture());
    [deployer, user] = await hre.ethers.getSigners();

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
        .withArgs(0, (await hre.ethers.provider.getBlock("latest")).timestamp + epochDuration);
    });

    it("should successfully start next epoch after first epoch ended", async () => {
      // need to set the duration before starting
      tx = await rewardsManagement.setEpochDuration(epochDuration);
      await tx.wait();

      // start it the first time
      tx = await rewardsManagement.startEpoch();
      await tx.wait();

      // advance time past expiry
      await hre.ethers.provider.send("evm_increaseTime", [epochDuration + 1]);

      await expect(await rewardsManagement.startEpoch())
        .to.emit(rewardsManagement, "EpochStarted")
        .withArgs(1, (await hre.ethers.provider.getBlock("latest")).timestamp + epochDuration);
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

    it("should fail to start an epoch if not the diamond owner", async () => {
      await expect(rewardsManagement.connect(user).startEpoch()).to.be.revertedWith(
        "LibDiamond: Must be contract owner"
      );
    });
  });

  describe("Setting rewards distribution", async () => {
    beforeEach(async () => {
      epochRewards = hre.ethers.utils.parseEther("10.0");

      // need to set the duration before starting
      tx = await rewardsManagement.setEpochDuration(epochDuration);
      await tx.wait();

      // start the epoch
      tx = await rewardsManagement.startEpoch();
      await tx.wait();

      // advance until end of epoch
      await hre.ethers.provider.send("evm_increaseTime", [epochDuration]);
      await hre.ethers.provider.send("evm_mine");

      // create merkle tree for airdrop
      const buf2hex = (x) => "0x" + x.toString("hex");
      rewardAddressAndAmount = [[user.address, hre.ethers.utils.parseEther("5.0")]];
      const leafNodes = rewardAddressAndAmount.map((entry) =>
        hre.ethers.utils.solidityKeccak256(["address", "uint256"], [entry[0], entry[1]])
      );
      const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
      rootHash = merkleTree.getRoot();
      userProof = merkleTree.getProof(leafNodes[0]).map((x) => buf2hex(x.data));
    });

    it("should emit an event after setting the rewards distribution", async () => {
      await expect(await rewardsManagement.setEpochRewardsDistribution(0, rootHash, epochRewards))
        .to.emit(rewardsManagement, "EpochRewardsDistributionSet")
        .withArgs(0, epochRewards);
    });

    it("should fail to set rewards distribution if not the diamond owner", async () => {
      await expect(
        rewardsManagement.connect(user).setEpochRewardsDistribution(0, rootHash, epochRewards)
      ).to.be.revertedWith("LibDiamond: Must be contract owner");
    });

    it("should fail to set rewards distribution if the epoch has not ended", async () => {
      await expect(rewardsManagement.setEpochRewardsDistribution(1, rootHash, epochRewards)).to.be.revertedWith(
        "Epoch has not ended"
      );
    });

    it("should fail to set rewards distribution twice for the same epoch", async () => {
      tx = await rewardsManagement.setEpochRewardsDistribution(0, rootHash, epochRewards);
      await tx.wait();

      await expect(rewardsManagement.setEpochRewardsDistribution(0, rootHash, epochRewards)).to.be.revertedWith(
        "Epoch rewards already set"
      );
    });
  });
});
