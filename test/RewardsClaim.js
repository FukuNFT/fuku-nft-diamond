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

  // rewards parameters
  let epochDuration;
  let collection;
  let collectionAllocation;
  let expectedRewards;

  let bidAmount;
  let nftId;

  beforeEach(async () => {
    // initialize fixture values
    ({ rewardsClaim, rewardsManagement, bidMarket, vaultAccounting, testERC721, vaultNames } = await fixture());
    [deployer, user] = await ethers.getSigners();
    rewardsClaim = rewardsClaim.connect(user);

    // initialize rewards parameters
    currentEpoch = 0;
    epochDuration = 604800; // 1 week
    collection = testERC721.address;
    collectionAllocation = ethers.utils.parseEther("15.0");
    collectionFloorPrice = ethers.utils.parseEther("1.0");
    expectedRewards = collectionAllocation;

    bidAmount = ethers.utils.parseEther("2.0");
    nftId = 0;

    // set up the rewards management
    tx = await rewardsManagement.setEpochDuration(epochDuration);
    await tx.wait();
    tx = await rewardsManagement.setCollectionAllocation(collection, collectionAllocation, collectionFloorPrice);
    await tx.wait();
    tx = await rewardsManagement.startEpoch();
    await tx.wait();

    // deposit into vault
    tx = await vaultAccounting.connect(user).deposit(vaultNames.empty, { value: ethers.utils.parseEther("5.0") });
    await tx.wait();

    // place a bid
    tx = await bidMarket.connect(user).placeBid([vaultNames.empty, collection, nftId, bidAmount]);
    await tx.wait();

    // advance time past expiry
    await ethers.provider.send("evm_increaseTime", [epochDuration + 1]);
  });

  it("should successfully emit event when claiming rewards", async () => {
    await expect(await rewardsClaim.connect(user).claimRewards(currentEpoch))
      .to.emit(rewardsClaim, "RewardsClaim")
      .withArgs(user.address, currentEpoch, expectedRewards);
  });
});
