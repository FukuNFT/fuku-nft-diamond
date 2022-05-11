const { ethers } = require("hardhat");
const { getSelectors, FacetCutAction } = require("./libraries/diamond.js");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const VAULT = "0xeeeeeeeeeeeeeeeeeeeeeeee";
const COLLECTION_ADDRESS = "0x4f599C9703691a545F752C3c0d50e97fC030146C";
const DIAMOND_CONTRACT = "0x92b5E83e22AE79DA3BbF811A3dC4f2036cB3623f";
const AMOUNT_TO_DP = ethers.utils.parseEther("0.5");

const BIDS = [
  {
    nftID: 4,
    amount: ethers.utils.parseEther("0.002"),
  },
  {
    nftID: 6,
    amount: ethers.utils.parseEther("0.07"),
  },
  {
    nftID: 8,
    amount: ethers.utils.parseEther("0.1"),
  },
];

async function main() {
  const [accountOne] = await ethers.getSigners();
  const accountOneAddress = await accountOne.getAddress();
  // Deposit to vault
  const vaultAccounting = await ethers.getContractAt("IVaultAccounting", DIAMOND_CONTRACT);
  const dpTxn = await vaultAccounting.connect(accountOne).deposit(VAULT, {
    value: AMOUNT_TO_DP,
  });
  await dpTxn.wait();
  const userETHBal = await vaultAccounting.userETHBalance(accountOneAddress, VAULT);
  console.log(`User ${accountOneAddress} has a balance of ${userETHBal.toString()}`);

  // Place bid
  const bidMarket = await ethers.getContractAt("IBidMarket", DIAMOND_CONTRACT);
  for (const bid of BIDS) {
    const bidTxn = await bidMarket.placeBid([VAULT, COLLECTION_ADDRESS, bid.nftID, bid.amount]);
    await bidTxn.wait();
    console.log(`Bid placed for NFT ${bid.nftID}`);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
