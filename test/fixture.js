const { ethers, deployments } = require("hardhat");
const { getSelectors, FacetCutAction } = require("../scripts/libraries/diamond.js");

const fixture = deployments.createFixture(async () => {
  // get signers
  const signers = await ethers.getSigners();
  const [deployer, user] = signers;

  // deploy the diamond cut facet
  const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
  const diamonCutFacet = await DiamondCutFacet.deploy();
  await diamonCutFacet.deployed();

  // deploy the diamond
  const Diamond = await ethers.getContractFactory("Diamond");
  const diamond = await Diamond.deploy(deployer.address, diamonCutFacet.address);
  await diamond.deployed();

  // deploy the init contract
  const FukuInit = await ethers.getContractFactory("FukuInit");
  const fukuInit = await FukuInit.deploy();
  await fukuInit.deployed();

  // deploy the other facets
  const FacetNames = ["DiamondLoupeFacet", "OwnershipFacet", "VaultAccountingFacet", "VaultManagementFacet"];
  const cut = [];
  for (const FacetName of FacetNames) {
    const Facet = await ethers.getContractFactory(FacetName);
    const facet = await Facet.deploy();
    await facet.deployed();
    cut.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet),
    });
  }

  // call to diamond cut
  const calldata = fukuInit.interface.encodeFunctionData("init");
  const diamondCut = await ethers.getContractAt("IDiamondCut", diamond.address);
  tx = await diamondCut.diamondCut(cut, fukuInit.address, calldata);
  await tx.wait();

  // get the facets of the diamond
  const vaultAccounting = await ethers.getContractAt("IVaultAccounting", diamond.address);
  const vaultManagement = await ethers.getContractAt("IVaultManagement", diamond.address);

  // create vault names
  const vaultNames = {
    empty: "0xeeeeeeeeeeeeeeeeeeeeeeee",
  };

  // create and register vault
  const EmptyVault = await ethers.getContractFactory("EmptyVault");
  const emptyVault = await EmptyVault.deploy();
  await emptyVault.deployed();

  tx = await vaultManagement.registerVault(vaultNames.empty, emptyVault.address);
  await tx.wait();

  return {
    diamond,
    diamondCut,
    vaultAccounting,
    vaultManagement,
    vaultNames,
  };
});

module.exports = { fixture };
