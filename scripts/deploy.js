const { ethers } = require("hardhat");

const { getSelectors, FacetCutAction } = require("./libraries/diamond.js");

async function deploy() {
  // get signers
  const signers = await ethers.getSigners();
  const deployer = signers[0];

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
  const FacetNames = ["DiamondLoupeFacet", "OwnershipFacet"];
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
}

deploy()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
