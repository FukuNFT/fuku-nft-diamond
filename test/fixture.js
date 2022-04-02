const { ethers, deployments } = require("hardhat");
const { getSelectors, FacetCutAction } = require("../scripts/libraries/diamond.js");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

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
  const FacetNames = [
    "DiamondLoupeFacet",
    "OwnershipFacet",
    "BidMarketFacet",
    "OptionMarketFacet",
    "VaultAccountingFacet",
    "VaultManagementFacet",
    "AirdropClaimFacet",
    "RewardsClaimFacet",
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

  // create a test ERC721
  const TestERC721 = await ethers.getContractFactory("TestERC721");
  const testERC721 = await TestERC721.deploy();
  await testERC721.deployed();

  // create a test crypto punks contract
  const CryptoPunks = await ethers.getContractFactory("TestCryptoPunks");
  const cryptoPunks = await CryptoPunks.deploy();
  await cryptoPunks.deployed();

  // create a test Fuku token
  const FukuToken = await ethers.getContractFactory("TestFukuToken");
  const fukuToken = await FukuToken.deploy("Fuku", "FUKU");
  await fukuToken.deployed();

  // create merkle tree for airdrop
  const buf2hex = (x) => "0x" + x.toString("hex");
  const whitelistAddressesAndAmounts = [
    [deployer.address, ethers.utils.parseEther("2.0")],
    [user.address, ethers.utils.parseEther("3.0")],
  ];
  const leafNodes = whitelistAddressesAndAmounts.map((entry) =>
    ethers.utils.solidityKeccak256(["address", "uint256"], [entry[0], entry[1]])
  );
  const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
  const rootHash = merkleTree.getRoot();
  const deployerProof = merkleTree.getProof(leafNodes[0]).map((x) => buf2hex(x.data));
  const userProof = merkleTree.getProof(leafNodes[1]).map((x) => buf2hex(x.data));
  const totalAirdropAmount = ethers.utils.parseEther("1000");
  const initialUnlockBps = 3000;
  tx = await fukuToken.approve(diamond.address, totalAirdropAmount);
  await tx.wait();

  // call to diamond cut
  const calldata = fukuInit.interface.encodeFunctionData("init", [
    cryptoPunks.address,
    [rootHash, fukuToken.address, totalAirdropAmount, initialUnlockBps],
  ]);
  const diamondCut = await ethers.getContractAt("IDiamondCut", diamond.address);
  tx = await diamondCut.diamondCut(cut, fukuInit.address, calldata);
  await tx.wait();

  // get the facets of the diamond
  const bidMarket = await ethers.getContractAt("IBidMarket", diamond.address);
  const optionMarket = await ethers.getContractAt("IOptionMarket", diamond.address);
  const vaultAccounting = await ethers.getContractAt("IVaultAccounting", diamond.address);
  const vaultManagement = await ethers.getContractAt("IVaultManagement", diamond.address);
  const airdropClaim = await ethers.getContractAt("IAirdropClaim", diamond.address);
  const rewardsClaim = await ethers.getContractAt("IRewardsClaim", diamond.address);

  // create vault names
  const vaultNames = {
    empty: "0xeeeeeeeeeeeeeeeeeeeeeeee",
  };

  // create and register vault
  const EmptyVault = await ethers.getContractFactory("EmptyVault");
  const emptyVault = await EmptyVault.deploy(diamond.address);
  await emptyVault.deployed();
  tx = await vaultManagement.registerVault(vaultNames.empty, emptyVault.address);
  await tx.wait();

  return {
    diamond,
    diamondCut,
    bidMarket,
    optionMarket,
    vaultAccounting,
    vaultManagement,
    airdropClaim,
    rewardsClaim,
    vaultNames,
    testERC721,
    cryptoPunks,
    fukuToken,
    whitelistAddressesAndAmounts,
    rootHash,
    deployerProof,
    userProof,
  };
});

module.exports = { fixture };
