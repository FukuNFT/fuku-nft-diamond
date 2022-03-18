const { ethers } = require("hardhat");
const { expect } = require("chai");

const { fixture } = require("./fixture");

describe("Vault Management", async () => {
  let deployer, user;
  let diamond;
  let vaultManagement;
  let vaultNames;

  beforeEach(async () => {
    ({ diamond, vaultManagement, vaultNames } = await fixture());
    [deployer, user] = await ethers.getSigners();
  });

  it("should successfully register a vault", async () => {
    const vaultName = "0xeeeeeeeeeeeeeeeeeeeeeeef";

    // deploy the new vault
    const EmptyVault = await ethers.getContractFactory("EmptyVault");
    const emptyVault = await EmptyVault.deploy(diamond.address);

    // register
    await vaultManagement.registerVault(vaultName, emptyVault.address);
    expect(await vaultManagement.getVault(vaultName)).to.equal(emptyVault.address);
  });

  it("should fail to register a vault if not diamond owner", async () => {
    const vaultName = "0xeeeeeeeeeeeeeeeeeeeeeeef";

    // deploy the new vault
    const EmptyVault = await ethers.getContractFactory("EmptyVault");
    const emptyVault = await EmptyVault.deploy(diamond.address);

    // register
    await expect(vaultManagement.connect(user).registerVault(vaultName, emptyVault.address)).to.be.revertedWith(
      "LibDiamond: Must be contract owner"
    );
  });

  it("should fail to register a vault if name is already in use", async () => {
    // deploy the new vault
    const EmptyVault = await ethers.getContractFactory("EmptyVault");
    const emptyVault = await EmptyVault.deploy(diamond.address);

    // register
    await expect(vaultManagement.registerVault(vaultNames.empty, emptyVault.address)).to.be.revertedWith(
      "Vault already registered"
    );
  });

  it("should successfully unregister a vault", async () => {
    const vaultName = "0xeeeeeeeeeeeeeeeeeeeeeeef";

    // deploy the new vault
    const EmptyVault = await ethers.getContractFactory("EmptyVault");
    const emptyVault = await EmptyVault.deploy(diamond.address);

    // register
    await vaultManagement.registerVault(vaultName, emptyVault.address);
    expect(await vaultManagement.getVault(vaultName)).to.equal(emptyVault.address);

    // unregister
    await vaultManagement.unregisterVault(vaultName);
    expect(await vaultManagement.getVault(vaultName)).to.not.equal(emptyVault.address);
  });

  it("should fail to unregister a vault if not diamond owner", async () => {
    const vaultName = "0xeeeeeeeeeeeeeeeeeeeeeeef";

    // deploy the new vault
    const EmptyVault = await ethers.getContractFactory("EmptyVault");
    const emptyVault = await EmptyVault.deploy(diamond.address);

    // register
    await vaultManagement.registerVault(vaultName, emptyVault.address);
    expect(await vaultManagement.getVault(vaultName)).to.equal(emptyVault.address);

    // unregister
    await expect(vaultManagement.connect(user).unregisterVault(vaultName)).to.be.revertedWith(
      "LibDiamond: Must be contract owner"
    );
  });

  it("should fail to unregister a vault if name is not in use", async () => {
    const vaultName = "0xeeeeeeeeeeeeeeeeeeeeeeef";

    // unregister
    await expect(vaultManagement.unregisterVault(vaultName)).to.be.revertedWith("Vault already unregistered");
  });
});
