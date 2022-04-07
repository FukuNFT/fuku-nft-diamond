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
  let epochDuration;
  let collection;
  let collectionAllocation;
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
    await expect(await rewardsClaim.claimRewards(currentEpoch))
      .to.emit(rewardsClaim, "RewardsClaim")
      .withArgs(user.address, currentEpoch, expectedRewards);
  });

  it("should successfully transfer expect reward tokens", async () => {
    const userBalBefore = await fukuToken.balanceOf(user.address);

    tx = await rewardsClaim.claimRewards(currentEpoch);
    await tx.wait();

    const userBalAfter = await fukuToken.balanceOf(user.address);

    expect(userBalAfter.sub(userBalBefore)).to.equal(expectedRewards);
  });

  it("should succesfully distribute rewards to more than one user", async () => {
    // setup for user 2
    tx = await vaultAccounting.connect(user2).deposit(vaultNames.empty, { value: ethers.utils.parseEther("5.0") });
    await tx.wait();

    // set up next epoch
    tx = await rewardsManagement.setCollectionAllocation(collection, collectionAllocation, collectionFloorPrice);
    await tx.wait();
    tx = await rewardsManagement.startEpoch();
    await tx.wait();

    // user place 1 competitive bid
    tx = await bidMarket.connect(user).placeBid([vaultNames.empty, collection, nftId, bidAmount]);
    await tx.wait();

    // user2 place 2 competitive bids
    tx = await bidMarket.connect(user2).placeBid([vaultNames.empty, collection, nftId, bidAmount]);
    await tx.wait();
    tx = await bidMarket.connect(user2).placeBid([vaultNames.empty, collection, nftId, bidAmount]);
    await tx.wait();

    // advance time past expiry
    await ethers.provider.send("evm_increaseTime", [epochDuration + 1]);

    const expectedRewardsUser = ethers.utils.parseEther("5.0");
    const expectedRewardsUser2 = ethers.utils.parseEther("10.0");
    // claim for user 1
    await expect(await rewardsClaim.connect(user).claimRewards(currentEpoch + 1))
      .to.emit(rewardsClaim, "RewardsClaim")
      .withArgs(user.address, currentEpoch + 1, expectedRewardsUser);
    // claim for user 2
    await expect(await rewardsClaim.connect(user2).claimRewards(currentEpoch + 1))
      .to.emit(rewardsClaim, "RewardsClaim")
      .withArgs(user2.address, currentEpoch + 1, expectedRewardsUser2);
  });

  it("should fail to claim rewards if epoch has not started", async () => {
    await expect(rewardsClaim.claimRewards(1)).to.be.revertedWith("Epoch not started");
  });

  it("should fail to claim rewards if epoch has not ended", async () => {
    // start a new epoch
    tx = await rewardsManagement.startEpoch();
    await tx.wait();

    await expect(rewardsClaim.claimRewards(1)).to.be.revertedWith("Epoch not ended");
  });

  it("should fail to claim rewards if user has none", async () => {
    await expect(rewardsClaim.connect(deployer).claimRewards(currentEpoch)).to.be.revertedWith("User has no rewards");
  });
});
