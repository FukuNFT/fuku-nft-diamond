const { ethers } = require("hardhat");
const { getSelectors, FacetCutAction } = require("./libraries/diamond.js");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

async function main() {
  // get the deployer (diamond admin)
  const [deployer] = await ethers.getSigners();

  // deploy the diamond cut facet
  const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
  const diamondCutFacet = await DiamondCutFacet.deploy();
  await diamondCutFacet.deployed();

  // deploy the diamond
  const Diamond = await ethers.getContractFactory("Diamond");
  const diamond = await Diamond.deploy(deployer.address, diamondCutFacet.address);
  await diamond.deployed();
  console.log("Diamond deployed:", diamond.address);

  // deploy the init contract
  const FukuInit = await ethers.getContractFactory("FukuInit");
  const fukuInit = await FukuInit.deploy();
  await fukuInit.deployed();

  // deploy the other facets
  const FacetNames = [
    "DiamondLoupeFacet",
    "OwnershipFacet",
    "BidMarketFacet",
    "OptionMarketFacet",
    "VaultAccountingFacet",
    "VaultManagementFacet",
    "AirdropClaimFacet",
    "RewardsClaimFacet",
    "RewardsManagementFacet",
  ];
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

  // create a test crypto punks contract
  const CryptoPunks = await ethers.getContractFactory("TestCryptoPunks");
  const cryptoPunks = await CryptoPunks.deploy();
  await cryptoPunks.deployed();
  console.log("CryptoPunks deployed:", cryptoPunks.address);

  // create a test Fuku token
  const FukuToken = await ethers.getContractFactory("TestFukuToken");
  const fukuToken = await FukuToken.deploy("Fuku", "FUKU");
  await fukuToken.deployed();
  console.log("Fuku token deployed:", fukuToken.address);

  // create merkle tree for airdrop
  const buf2hex = (x) => "0x" + x.toString("hex");
  const whitelistAddressesAndAmounts = [[deployer.address, ethers.utils.parseEther("2.0")]];
  const leafNodes = whitelistAddressesAndAmounts.map((entry) =>
    ethers.utils.solidityKeccak256(["address", "uint256"], [entry[0], entry[1]])
  );
  const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
  const rootHash = merkleTree.getRoot();
  const totalAirdropAmount = ethers.utils.parseEther("1000");
  const initialUnlockBps = 3000;
  tx = await fukuToken.approve(diamond.address, ethers.utils.parseEther("10000"));
  await tx.wait();

  // initialize diamond
  const calldata = fukuInit.interface.encodeFunctionData("init", [
    cryptoPunks.address,
    [rootHash, fukuToken.address, totalAirdropAmount, initialUnlockBps],
  ]);
  const diamondCut = await ethers.getContractAt("IDiamondCut", diamond.address);
  tx = await diamondCut.diamondCut(cut, fukuInit.address, calldata);
  await tx.wait();
  console.log("Diamond initialized.");

  // create and register vault
  const vaultManagement = await ethers.getContractAt("IVaultManagement", diamond.address);
  const EmptyVault = await ethers.getContractFactory("EmptyVault");
  const emptyVault = await EmptyVault.deploy(diamond.address);
  await emptyVault.deployed();
  tx = await vaultManagement.registerVault("0xeeeeeeeeeeeeeeeeeeeeeeee", emptyVault.address);
  await tx.wait();
  console.log("Empty vault registered:", emptyVault.address);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
