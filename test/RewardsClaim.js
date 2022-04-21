const { ethers } = require("hardhat");
const { expect } = require("chai");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const { fixture } = require("./fixture");

describe("Rewards Claim", async () => {
  // fixture values
  let deployer, user;
  let rewardsClaim;
  let rewardsManagement;
  let fukuToken;

  // rewards parameters
  let currentEpoch;
  let epochDuration;
  let epochRewards;
  let expectedRewards;
  let bidAmount;
  let nftId;
  let rewardAddressAndAmount;
  let rootHash;
  let userProof;
  let user2Proof;

  beforeEach(async () => {
    // initialize fixture values
    ({ rewardsClaim, rewardsManagement, fukuToken } = await fixture());
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

    // advance until end of epoch
    await ethers.provider.send("evm_increaseTime", [epochDuration]);
    await ethers.provider.send("evm_mine");

    // create merkle tree for airdrop
    const buf2hex = (x) => "0x" + x.toString("hex");
    rewardAddressAndAmount = [
      [user.address, ethers.utils.parseEther("5.0")],
      [user2.address, ethers.utils.parseEther("5.0")],
    ];
    const leafNodes = rewardAddressAndAmount.map((entry) =>
      ethers.utils.solidityKeccak256(["address", "uint256"], [entry[0], entry[1]])
    );
    expectedRewards = rewardAddressAndAmount[0][1];
    const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
    rootHash = merkleTree.getRoot();
    userProof = merkleTree.getProof(leafNodes[0]).map((x) => buf2hex(x.data));
    user2Proof = merkleTree.getProof(leafNodes[1]).map((x) => buf2hex(x.data));

    // set rewards
    epochRewards = ethers.utils.parseEther("10.0");
    tx = await rewardsManagement.setEpochRewardsDistribution(0, rootHash, epochRewards);
    await tx.wait();
  });

  it("should successfully claim rewards and emit event", async () => {
    await expect(await rewardsClaim.claimRewards(currentEpoch, expectedRewards, userProof))
      .to.emit(rewardsClaim, "RewardsClaim")
      .withArgs(user.address, currentEpoch, expectedRewards);
  });

  it("should successfully claim rewards and transfer tokens", async () => {
    await expect(() => rewardsClaim.claimRewards(currentEpoch, expectedRewards, userProof)).to.changeTokenBalance(
      fukuToken,
      user,
      expectedRewards
    );
  });

  it("should fail to claim rewards if epoch has not started", async () => {
    await expect(rewardsClaim.claimRewards(currentEpoch + 1, expectedRewards, userProof)).to.be.revertedWith(
      "Epoch not started"
    );
  });

  it("should fail to claim rewards if epoch has not ended", async () => {
    // advance time past expiry
    await ethers.provider.send("evm_increaseTime", [epochDuration + 1]);
    await ethers.provider.send("evm_mine");

    // start a new epoch
    tx = await rewardsManagement.startEpoch();
    await tx.wait();

    await expect(rewardsClaim.claimRewards(currentEpoch + 1, expectedRewards, userProof)).to.be.revertedWith(
      "Epoch not ended"
    );
  });

  it("should fail to claim rewards rewards have not been set", async () => {
    // start a new epoch
    tx = await rewardsManagement.startEpoch();
    await tx.wait();

    // advance time past expiry
    await ethers.provider.send("evm_increaseTime", [epochDuration + 1]);
    await ethers.provider.send("evm_mine");

    await expect(rewardsClaim.claimRewards(currentEpoch + 1, expectedRewards, userProof)).to.be.revertedWith(
      "Epoch rewards not set"
    );
  });

  it("should fail to claim if user already claimed", async () => {
    tx = await rewardsClaim.claimRewards(currentEpoch, expectedRewards, userProof);
    await tx.wait();

    await expect(rewardsClaim.claimRewards(currentEpoch, expectedRewards, userProof)).to.be.revertedWith(
      "Already claimed"
    );
  });

  it("should fail to claim if wrong user proof", async () => {
    await expect(rewardsClaim.claimRewards(currentEpoch, expectedRewards, user2Proof)).to.be.revertedWith(
      "Invalid merkle proof"
    );
  });
});
