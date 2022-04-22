const hre = require("hardhat");
const chai = require("chai");
const { expect } = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);

const { fixture } = require("./fixture");

describe("Airdrop Claim", async () => {
  // fixture values
  let deployer, user;
  let fukuToken;
  let airdropClaim;
  let whitelistAddressesAndAmounts;
  let deployerProof;
  let userProof;

  // aidrop parameters
  let userAirdropAmount;

  beforeEach(async () => {
    // initialize fixture values
    ({ fukuToken, airdropClaim, whitelistAddressesAndAmounts, deployerProof, userProof } = await fixture());
    [deployer, user] = await hre.ethers.getSigners();
    airdropClaim = airdropClaim.connect(user);

    // initialize aidrop parameters
    userAirdropAmount = whitelistAddressesAndAmounts[1][1];
  });

  it("should successfully recognize an airdrop claim", async () => {
    await expect(await airdropClaim.claimAirdrop(userAirdropAmount, userProof))
      .to.emit(airdropClaim, "AirdropClaim")
      .withArgs(user.address, userAirdropAmount);
  });

  it("should successfully transfer airdrop tokens", async () => {
    const expectClaim = userAirdropAmount;
    expect(await fukuToken.balanceOf(user.address)).to.equal(0);

    tx = await airdropClaim.claimAirdrop(userAirdropAmount, userProof);
    await tx.wait();

    expect(await fukuToken.balanceOf(user.address)).to.equal(expectClaim);
  });

  it("should fail to claim with an invalid airdrop amount", async () => {
    const invalidAmount = hre.ethers.utils.parseEther("10.0");

    await expect(airdropClaim.claimAirdrop(invalidAmount, userProof)).to.be.revertedWith("Invalid merkle proof");
  });

  it("should fail to claim with an invalid proof", async () => {
    const invalidProof = deployerProof;

    await expect(airdropClaim.claimAirdrop(userAirdropAmount, invalidProof)).to.be.revertedWith("Invalid merkle proof");
  });
});
