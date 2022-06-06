const { ethers } = require("hardhat");

async function main() {
  [user1, user2] = await ethers.getSigners();

  console.log("User 1 address is:", user1.address);

  // placeholder parameter values
  const collectionAddress = "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D"; // BAYC
  const nftID = 1;
  const premium = await ethers.utils.parseEther("1.0");
  const strike = await ethers.utils.parseEther("100.0");
  const optionDuration = 2592000;
  const nonce = 1;

  // hash message
  const message = await ethers.utils.solidityKeccak256(
    ["address", "uint256", "uint256", "uint256", "uint256", "uint256"],
    [collectionAddress, nftID, premium, strike, optionDuration, nonce]
  );
  console.log("Hashed message is:", message);

  // user 1 signs message
  const signature = await user1.signMessage(message);
  console.log("Signature is:", signature);

  // verifies that user 1 did sign the message
  const verifyAddress = await ethers.utils.verifyMessage(message, signature);
  console.log("Signature signer is:", verifyAddress);

  //todos:
  // 1. verification that signer = owner of nft
  // 2. link up with Jay/Dimitri to setup mock frontend to test
  // 3. chat with team about off-chain storage of parameters
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
