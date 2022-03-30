const { ethers } = require("hardhat");
const { expect } = require("chai");

const { fixture } = require("./fixture");

describe("Airdrop Claim", async () => {
  // fixture values
  let deployer, user;
  let airdropClaim;
  let whitelistAddressesAndAmounts;
  let rootHash;
  let userProof;

  // aidrop parameters
  let userAirdropAmount;

  beforeEach(async () => {
    // initialize fixture values
    ({ airdropClaim, whitelistAddressesAndAmounts, rootHash, userProof } = await fixture());
    [deployer, user] = await ethers.getSigners();
    airdropClaim = airdropClaim.connect(user);

    // initialize aidrop parameters
    userAirdropAmount = whitelistAddressesAndAmounts[1][1];
  });

  it("should successfully recognize an airdrop claim", async () => {
    await expect(await airdropClaim.claimAirdrop(userAirdropAmount, userProof))
      .to.emit(airdropClaim, "AirdropClaim")
      .withArgs(user.address, userAirdropAmount);
  });
});
