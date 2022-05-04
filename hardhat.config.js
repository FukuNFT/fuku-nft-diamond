require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require("hardhat-deploy");
require("hardhat-deploy-ethers");
require("hardhat-gas-reporter");
require("dotenv").config();

const MAINNET_URL = process.env.MAINNET_URL ? process.env.MAINNET_URL : "";

module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: MAINNET_URL,
        enabled: true,
      },
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
    coinmarketcap: process.env.COINMARKETCAP_API,
  },
};
