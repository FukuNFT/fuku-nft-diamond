const { ethers } = require("hardhat");
const { expect } = require("chai");

const { fixture } = require("../fixture");

describe("Rocket Vault", async () => {
  // fixture values
  let deployer, user;
  let vaultAccounting;
  let vaultManagement;
  let vaultNames;

  // vault parameters
  let depositAmount;
  let expectedEthAmount;
  let expectedLpToken;
  let expectedLpTokenAmount;
  let rocketVault;

  beforeEach(async () => {
    // initialize fixture values
    ({ vaultAccounting, vaultManagement, vaultNames } = await fixture());
    [deployer, user] = await ethers.getSigners();

    // initialize vault parameters
    depositAmount = ethers.utils.parseEther("1.0");
    expectedEthAmount = ethers.utils.parseEther("1.0");
    expectedLpToken = "0xae78736Cd615f374D3085123A210448E74Fc6393"; // rETH token address
    rocketVault = await ethers.getContractAt("IVault", await vaultManagement.getVault(vaultNames.rocketVault)); 
    expectedLpTokenAmount = await rocketVault.getAmountLpTokens(depositAmount); //gets rETH amount equivalent to 1 ETH
  });

  it("Should reflect correct conversion from lp tokens to ETH", async () => {
    expect(await rocketVault.getAmountETH(expectedLpTokenAmount)).to.be.equal(expectedEthAmount);
  });

  it("Should reflect correct conversion from ETH to lp tokens", async () => {
    expect(await rocketVault.getAmountLpTokens(expectedEthAmount)).to.be.equal(expectedLpTokenAmount);
  });

});
