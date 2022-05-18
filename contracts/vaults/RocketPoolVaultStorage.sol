// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IRocketPoolVaultStorage } from "../interfaces/vaults/IRocketPoolVaultStorage.sol";

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract RocketPoolVaultStorage is IRocketPoolVaultStorage, Ownable {
    //stores the current vault implementation
    address currentImplementation;

    mapping(address => address) delegate;

    constructor(address _currentImplemntation) {
        currentImplementation = _currentImplemntation;
    }

    function getCurrentImplementation() public view override returns (address) {
        return currentImplementation;
    }

    function setNewImplementation(address newImplementation) external override onlyOwner {
        currentImplementation = newImplementation;
    }

    function setDelegateAddress(address user, address delegateAddress) external override onlyOwner {
        delegate[user] = delegateAddress;
    }

    function getDelegateAddress(address user) public view override returns (address) {
        return delegate[user];
    }
}
