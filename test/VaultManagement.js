const { ethers } = require("hardhat");
const { expect } = require("chai");

const { fixture } = require("./fixture");

describe("Vault Management", async () => {
  // fixture values
  let deployer, user;
  let diamond;
  let vaultManagement;
  let vaultNames;

  // vault parameters
  let vaultName;
  let newWeth;

  beforeEach(async () => {
    // initialize fixture values
    ({ diamond, vaultManagement, vaultNames } = await fixture());
    [deployer, user] = await ethers.getSigners();

    // initialize vault parameters
    vaultName = "0xeeeeeeeeeeeeeeeeeeeeeeef";
    const Weth = await ethers.getContractFactory("TestWeth");
    newWeth = await Weth.deploy("Wrapped ETH", "WETH");
    await newWeth.deployed();
  });

  it("should successfully register a vault", async () => {
    // deploy the new vault
    const EmptyVault = await ethers.getContractFactory("EmptyVault");
    const emptyVault = await EmptyVault.deploy(diamond.address, newWeth.address, "New Empty Vault", "fETH");
    await emptyVault.deployed();

    // register
    tx = await vaultManagement.registerVault(vaultName, emptyVault.address);
    await tx.wait();
    expect(await vaultManagement.getVault(vaultName)).to.equal(emptyVault.address);
  });

  it("should fail to register a vault if not diamond owner", async () => {
    // deploy the new vault
    const EmptyVault = await ethers.getContractFactory("EmptyVault");
    const emptyVault = await EmptyVault.deploy(diamond.address, newWeth.address, "New Empty Vault", "fETH");
    await emptyVault.deployed();

    // register
    await expect(vaultManagement.connect(user).registerVault(vaultName, emptyVault.address)).to.be.revertedWith(
      "LibDiamond: Must be contract owner"
    );
  });

  it("should fail to register a vault if name is already in use", async () => {
    // deploy the new vault
    const EmptyVault = await ethers.getContractFactory("EmptyVault");
    const emptyVault = await EmptyVault.deploy(diamond.address, newWeth.address, "New Empty Vault", "fETH");
    await emptyVault.deployed();

    // register
    await expect(vaultManagement.registerVault(vaultNames.empty, emptyVault.address)).to.be.revertedWith(
      "Vault already registered"
    );
  });

  it("should successfully unregister a vault", async () => {
    // deploy the new vault
    const EmptyVault = await ethers.getContractFactory("EmptyVault");
    const emptyVault = await EmptyVault.deploy(diamond.address, newWeth.address, "New Empty Vault", "fETH");
    await emptyVault.deployed();

    // register
    tx = await vaultManagement.registerVault(vaultName, emptyVault.address);
    await tx.wait();
    expect(await vaultManagement.getVault(vaultName)).to.equal(emptyVault.address);

    // unregister
    tx = await vaultManagement.unregisterVault(vaultName);
    await tx.wait();
    expect(await vaultManagement.getVault(vaultName)).to.not.equal(emptyVault.address);
  });

  it("should fail to unregister a vault if not diamond owner", async () => {
    // deploy the new vault
    const EmptyVault = await ethers.getContractFactory("EmptyVault");
    const emptyVault = await EmptyVault.deploy(diamond.address, newWeth.address, "New Empty Vault", "fETH");
    await emptyVault.deployed();

    // register
    tx = await vaultManagement.registerVault(vaultName, emptyVault.address);
    await tx.wait();
    expect(await vaultManagement.getVault(vaultName)).to.equal(emptyVault.address);

    // unregister
    await expect(vaultManagement.connect(user).unregisterVault(vaultName)).to.be.revertedWith(
      "LibDiamond: Must be contract owner"
    );
  });

  it("should fail to unregister a vault if name is not in use", async () => {
    // unregister
    await expect(vaultManagement.unregisterVault(vaultName)).to.be.revertedWith("Vault already unregistered");
  });
});
