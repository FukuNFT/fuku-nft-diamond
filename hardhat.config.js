require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-abi-exporter");
require("hardhat-deploy");
require("hardhat-deploy-ethers");
require("hardhat-docgen");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

const MAINNET_URL = process.env.MAINNET_URL ? process.env.MAINNET_URL : "";
const RINKEBY_URL = process.env.RINKEBY_URL ? process.env.RINKEBY_URL : "";
const RINKEBY_PRIVATE_KEY = process.env.RINKEBY_PRIVATE_KEY
  ? process.env.RINKEBY_PRIVATE_KEY
  : "0000000000000000000000000000000000000000000000000000000000000000";
const COINMARKETCAP_API = process.env.COINMARKETCAP_API ? process.env.COINMARKETCAP_API : "";
const ETHERSCAN_API = process.env.ETHERSCAN_API ? process.env.ETHERSCAN_API : "";

module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: MAINNET_URL,
        enabled: false,
      },
    },
    rinkeby: {
      url: RINKEBY_URL,
      accounts: [RINKEBY_PRIVATE_KEY],
    },
  },
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  gasReporter: {
    enabled: false,
    currency: "USD",
    gasPrice: 25,
    coinmarketcap: COINMARKETCAP_API,
  },
  abiExporter: {
    path: "./export/abi-extracted",
    runOnCompile: true,
    clear: true,
    flat: true,
    only: ["Facet"],
    spacing: 2,
    pretty: false,
  },
  etherscan: {
    apiKey: ETHERSCAN_API,
  },
  docgen: {
    path: "./docs",
    clear: true,
    runOnCompile: true,
    only: ["^contracts/facets", "^contracts/vendor/facets", "FukuInit.sol"],
  },
};
