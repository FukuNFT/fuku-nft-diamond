const { ethers } = require("hardhat");

const { getSelectors, FacetCutAction } = require("./libraries/diamond.js");

async function deploy() {
  // get signers
  const signers = await ethers.getSigners();
  const [deployer, user] = signers;

  console.log("Deployer address:", deployer.address);

  // deploy the diamond cut facet
  const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
  const diamonCutFacet = await DiamondCutFacet.deploy();
  await diamonCutFacet.deployed();

  console.log("DiamondCutFacet address:", diamonCutFacet.address);

  // deploy the diamond
  const Diamond = await ethers.getContractFactory("Diamond");
  const diamond = await Diamond.deploy(deployer.address, diamonCutFacet.address);
  await diamond.deployed();

  console.log("Diamond address:", diamond.address);

  // deploy the init contract
  const FukuInit = await ethers.getContractFactory("FukuInit");
  const fukuInit = await FukuInit.deploy();
  await fukuInit.deployed();

  console.log("FukuInit address:", fukuInit.address);

  // deploy the other facets
  const FacetNames = ["DiamondLoupeFacet", "OwnershipFacet", "VaultAccountingFacet", "VaultManagementFacet"];
  const cut = [];
  for (const FacetName of FacetNames) {
    const Facet = await ethers.getContractFactory(FacetName);
    const facet = await Facet.deploy();
    await facet.deployed();
    console.log(`${FacetName} address: ${facet.address}`);
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

  console.log("Fuku init complete.");

  // test
  console.log("");
  console.log("Testing user deposit into empty vault");

  // create and register vault
  const EmptyVault = await ethers.getContractFactory("EmptyVault");
  const emptyVault = await EmptyVault.deploy();
  await emptyVault.deployed();
  const EMPTY_VAULT = "0xeeeeeeeeeeeeeeeeeeeeeeee";

  const vaultAccounting = await ethers.getContractAt("IVaultAccounting", diamond.address);
  const vaultManagement = await ethers.getContractAt("IVaultManagement", diamond.address);

  tx = await vaultManagement.registerVault(EMPTY_VAULT, emptyVault.address);
  await tx.wait();

  // test deposit
  tx = await vaultAccounting.connect(user).deposit(EMPTY_VAULT, { value: ethers.utils.parseEther("0.777") });
  await tx.wait();

  userBalance = await vaultAccounting.userBalance(user.address, EMPTY_VAULT);
  console.log("User balance after deposit:", ethers.utils.formatEther(userBalance));

  // deploy new version of empty vault
  const EmptyVaultUpgrade = await ethers.getContractFactory("EmptyVaultUpgrade");
  const emptyVaultUpgrade = await EmptyVaultUpgrade.deploy();
  await emptyVaultUpgrade.deployed();

  // upgrade vault
  tx = await vaultManagement.upgradeVault(EMPTY_VAULT, emptyVaultUpgrade.address);
  await tx.wait();

  // try to withdraw
  userBalance = await vaultAccounting.userBalance(user.address, EMPTY_VAULT);
  console.log("User balance after deposit:", ethers.utils.formatEther(userBalance));
  tx = await vaultAccounting.connect(user).withdraw(EMPTY_VAULT, user.address, userBalance);
  await tx.wait();

  console.log("Success.");
}

deploy()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
