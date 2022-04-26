const hre = require("hardhat");
const fs = require("fs");

async function main() {
  // compile contracts
  await hre.run("export-abi");

  // create abi object
  let fukuAbi = [];
  const abiFolder = "./artifacts/abi";
  fs.readdirSync(abiFolder).forEach((name) => {
    const facetAbiFile = abiFolder + "/" + name;
    const data = fs.readFileSync(facetAbiFile, "utf8");
    const facetAbi = JSON.parse(data);
    fukuAbi = fukuAbi.concat(facetAbi);
  });
  const diamondAbiDict = { abi: fukuAbi };
  const diamondAbi = JSON.stringify(diamondAbiDict, null, 2);

  // create the export folder if it doesn't exist
  const exportFolder = "./artifacts/export/";
  fs.mkdirSync(exportFolder, { recursive: true });
  // create the file
  fs.writeFileSync(exportFolder + "FukuDiamond.json", diamondAbi);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
