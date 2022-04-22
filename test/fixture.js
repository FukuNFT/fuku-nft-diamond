const hre = require("hardhat");
const { deployments } = require("hardhat");
const { getSelectors, FacetCutAction } = require("../scripts/libraries/diamond.js");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const fixture = deployments.createFixture(async () => {
  // get signers
  const signers = await hre.ethers.getSigners();
  const [deployer, user] = signers;

  // deploy the diamond cut facet
  const DiamondCutFacet = await hre.ethers.getContractFactory("DiamondCutFacet");
  const diamonCutFacet = await DiamondCutFacet.deploy();
  await diamonCutFacet.deployed();

  // deploy the diamond
  const Diamond = await hre.ethers.getContractFactory("Diamond");
  const diamond = await Diamond.deploy(deployer.address, diamonCutFacet.address);
  await diamond.deployed();

  // deploy the init contract
  const FukuInit = await hre.ethers.getContractFactory("FukuInit");
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
    const Facet = await hre.ethers.getContractFactory(FacetName);
    const facet = await Facet.deploy();
    await facet.deployed();
    cut.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet),
    });
  }

  // create a test ERC721
  const TestERC721 = await hre.ethers.getContractFactory("TestERC721");
  const testERC721 = await TestERC721.deploy();
  await testERC721.deployed();

  // create a test crypto punks contract
  const CryptoPunks = await hre.ethers.getContractFactory("TestCryptoPunks");
  const cryptoPunks = await CryptoPunks.deploy();
  await cryptoPunks.deployed();

  // create a test Fuku token
  const FukuToken = await hre.ethers.getContractFactory("TestFukuToken");
  const fukuToken = await FukuToken.deploy("Fuku", "FUKU");
  await fukuToken.deployed();

  // create merkle tree for airdrop
  const buf2hex = (x) => "0x" + x.toString("hex");
  const whitelistAddressesAndAmounts = [
    [deployer.address, hre.ethers.utils.parseEther("2.0")],
    [user.address, hre.ethers.utils.parseEther("3.0")],
  ];
  const leafNodes = whitelistAddressesAndAmounts.map((entry) =>
    hre.ethers.utils.solidityKeccak256(["address", "uint256"], [entry[0], entry[1]])
  );
  const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
  const rootHash = merkleTree.getRoot();
  const deployerProof = merkleTree.getProof(leafNodes[0]).map((x) => buf2hex(x.data));
  const userProof = merkleTree.getProof(leafNodes[1]).map((x) => buf2hex(x.data));
  const totalAirdropAmount = hre.ethers.utils.parseEther("1000");
  const initialUnlockBps = 3000;
  tx = await fukuToken.approve(diamond.address, hre.ethers.utils.parseEther("10000"));
  await tx.wait();

  // call to diamond cut
  const calldata = fukuInit.interface.encodeFunctionData("init", [
    cryptoPunks.address,
    [rootHash, fukuToken.address, totalAirdropAmount, initialUnlockBps],
  ]);
  const diamondCut = await hre.ethers.getContractAt("IDiamondCut", diamond.address);
  tx = await diamondCut.diamondCut(cut, fukuInit.address, calldata);
  await tx.wait();

  // get the facets of the diamond
  const bidMarket = await hre.ethers.getContractAt("IBidMarket", diamond.address);
  const optionMarket = await hre.ethers.getContractAt("IOptionMarket", diamond.address);
  const vaultAccounting = await hre.ethers.getContractAt("IVaultAccounting", diamond.address);
  const vaultManagement = await hre.ethers.getContractAt("IVaultManagement", diamond.address);
  const airdropClaim = await hre.ethers.getContractAt("IAirdropClaim", diamond.address);
  const rewardsClaim = await hre.ethers.getContractAt("IRewardsClaim", diamond.address);
  const rewardsManagement = await hre.ethers.getContractAt("IRewardsManagement", diamond.address);

  // create vault names
  const vaultNames = {
    empty: "0xeeeeeeeeeeeeeeeeeeeeeeee",
  };

  // create and register vault
  const EmptyVault = await hre.ethers.getContractFactory("EmptyVault");
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
    rewardsManagement,
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
