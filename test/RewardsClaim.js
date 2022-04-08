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
  let salesAllocation;
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
    salesAllocation = ethers.utils.parseEther("15.0");
    collectionFloorPrice = ethers.utils.parseEther("1.0");

    bidAmount = ethers.utils.parseEther("2.0");
    nftId = 0;

    // set up the rewards management
    tx = await rewardsManagement.setEpochDuration(epochDuration);
    await tx.wait();
    tx = await rewardsManagement.setCollectionAllocation(collection, collectionAllocation, collectionFloorPrice);
    await tx.wait();
    tx = await rewardsManagement.setSalesAllocation(salesAllocation);
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

  describe("Bidding rewards", async () => {
    beforeEach(async () => {
      expectedRewards = collectionAllocation;

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
  });

  describe("Sales rewards", async () => {
    beforeEach(async () => {
      expectedRewards = salesAllocation;

      // place a bid
      tx = await bidMarket.connect(user).placeBid([vaultNames.empty, collection, nftId, bidAmount]);
      await tx.wait();

      // approve token transfer
      tx = await testERC721.approve(bidMarket.address, 0);
      await tx.wait();

      // accept bid
      tx = await bidMarket.connect(deployer).acceptBid(0);
      await tx.wait();

      // advance time past expiry
      await ethers.provider.send("evm_increaseTime", [epochDuration + 1]);
    });

    it("should successfully emit event when claiming rewards", async () => {
      await expect(await rewardsClaim.connect(deployer).claimRewards(currentEpoch))
        .to.emit(rewardsClaim, "RewardsClaim")
        .withArgs(deployer.address, currentEpoch, expectedRewards);
    });

    it("should successfully transfer expect reward tokens", async () => {
      const userBalBefore = await fukuToken.balanceOf(deployer.address);

      tx = await rewardsClaim.connect(deployer).claimRewards(currentEpoch);
      await tx.wait();

      const userBalAfter = await fukuToken.balanceOf(deployer.address);

      expect(userBalAfter.sub(userBalBefore)).to.equal(expectedRewards);
    });

    it("should succesfully distribute rewards to more than one user", async () => {
      // set up next epoch
      tx = await rewardsManagement.setCollectionAllocation(collection, collectionAllocation, collectionFloorPrice);
      await tx.wait();
      tx = await rewardsManagement.setSalesAllocation(salesAllocation);
      await tx.wait();
      tx = await rewardsManagement.startEpoch();
      await tx.wait();

      // first give 2 nfts to user2
      tx = await testERC721.transferFrom(deployer.address, user2.address, 2);
      await tx.wait();
      tx = await testERC721.transferFrom(deployer.address, user2.address, 3);
      await tx.wait();

      // approve the nfts to diamond
      tx = await testERC721.connect(deployer).approve(bidMarket.address, 1);
      await tx.wait();
      tx = await testERC721.connect(user2).approve(bidMarket.address, 2);
      await tx.wait();
      tx = await testERC721.connect(user2).approve(bidMarket.address, 3);
      await tx.wait();

      // have user bid on them
      const newBidAmount = ethers.utils.parseEther("0.001");
      tx = await bidMarket.connect(user).placeBid([vaultNames.empty, collection, 1, newBidAmount]);
      await tx.wait();
      tx = await bidMarket.connect(user).placeBid([vaultNames.empty, collection, 2, newBidAmount]);
      await tx.wait();
      tx = await bidMarket.connect(user).placeBid([vaultNames.empty, collection, 3, newBidAmount]);
      await tx.wait();

      // accept the bids
      tx = await bidMarket.connect(deployer).acceptBid(1);
      await tx.wait();
      tx = await bidMarket.connect(user2).acceptBid(2);
      await tx.wait();
      tx = await bidMarket.connect(user2).acceptBid(3);
      await tx.wait();

      // advance time past expiry
      await ethers.provider.send("evm_increaseTime", [epochDuration + 1]);

      // get current balances of sellers
      const deployerBalBefore = await fukuToken.balanceOf(deployer.address);
      const user2BalBefore = await fukuToken.balanceOf(user2.address);

      // claim rewards
      tx = await rewardsClaim.connect(deployer).claimRewards(1);
      await tx.wait();
      tx = await rewardsClaim.connect(user2).claimRewards(1);
      await tx.wait();

      // get current balances of sellers
      const deployerBalAfter = await fukuToken.balanceOf(deployer.address);
      const user2BalAfter = await fukuToken.balanceOf(user2.address);

      const expectedDeployerRewards = ethers.utils.parseEther("5.0");
      const expectedUser2Rewards = ethers.utils.parseEther("10.0");

      expect(deployerBalAfter.sub(deployerBalBefore)).to.equal(expectedDeployerRewards);
      expect(user2BalAfter.sub(user2BalBefore)).to.equal(expectedUser2Rewards);
    });
  });
});
