const { ethers } = require("hardhat");
const { expect } = require("chai");

const { fixture } = require("./fixture");

describe("Rewards Claim", async () => {
  // fixture values
  let deployer, user;
  let rewardsClaim;

  // rewards parameters
  let expectedRewards;

  beforeEach(async () => {
    // initialize fixture values
    ({ rewardsClaim } = await fixture());
    [deployer, user] = await ethers.getSigners();
    rewardsClaim = rewardsClaim.connect(user);

    // initialize rewards parameters
    expectedRewards = 0;
  });

  it("should successfully emit event when claiming rewards", async () => {
    await expect(await rewardsClaim.claimRewards())
      .to.emit(rewardsClaim, "RewardsClaim")
      .withArgs(user.address, expectedRewards);
  });
});
