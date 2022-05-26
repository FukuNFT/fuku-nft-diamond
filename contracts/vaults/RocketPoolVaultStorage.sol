// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IRocketPoolVaultStorage } from "../interfaces/vaults/IRocketPoolVaultStorage.sol";

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract RocketPoolVaultStorage is IRocketPoolVaultStorage, Ownable {
    mapping(address => address) private delegate;

    function setDelegateAddress(address user, address delegateAddress) external override onlyOwner {
        delegate[user] = delegateAddress;
    }

    function transferOwnership(address newOwner) public override(IRocketPoolVaultStorage, Ownable) onlyOwner {
        super.transferOwnership(newOwner);
    }

    function getDelegateAddress(address user) external view override returns (address) {
        return delegate[user];
    }

    function owner() public view override(IRocketPoolVaultStorage, Ownable) returns (address) {
        return super.owner();
    }
}
