// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IDelegate } from "../interfaces/vaults/IDelegate.sol";
import { RocketStorageInterface } from "../interfaces/vaults/RocketStorageInterface.sol";
import { RocketPoolVaultStorage } from "../interfaces/vaults/RocketPoolVaultStorage.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

abstract contract BaseDelegate is IDelegate, ReentrancyGuard {
    RocketStorageInterface rocketStorage;
    RocketPoolVaultStorage rocketPoolVaultStorage; // holds the current vault implementation

    constructor(address _rocketStorageAddress, address _rocketPoolVaultStorageAddress) {
        rocketStorage = RocketStorageInterface(_rocketStorageAddress);
        rocketPoolVaultStorage = RocketPoolVaultStorage(_rocketPoolVaultStorageAddress);
    }

    modifier onlyCurrentImplementation() {
        address currentVaultImplementation = rocketPoolVaultStorage.getCurrentImplementation();
        require(msg.sender == currentVaultImplementation, "Only the current implementation can call function");
        _;
    }

    receive() external payable {}
}
