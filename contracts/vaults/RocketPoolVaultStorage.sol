// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { RocketVault } from "./RocketPoolVault.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract RocketPoolVaultStorage is Ownable {
    //stores the current vault implementation
    address currentImplementation;

    mapping(bytes32 => address) delegate;

    modifier onlyCurrentImplementation() {
        require(msg.sender == currentImplementation, "Only the current implementation can call function");
        _;
    }

    function initialize(address _currentImplemntation) external onlyOwner {
        // initialize instead of constructor
        // need this contract address for RocketPoolVault deployment
        // will pass in current implementation after
        currentImplementation = _currentImplemntation;
    }

    function getCurrentImplementation() public view returns (address) {
        return address(currentImplementation);
    }

    function setNewImplementation(address newImplementation) external onlyCurrentImplementation {
        currentImplementation = newImplementation;
    }

    function setDelegateAddress(bytes32 _data, address delegateAddress) external onlyCurrentImplementation {
        delegate[_data] = delegateAddress;
    }

    function getDelegateAddress(bytes32 _data) external view returns (address) {
        return delegate[_data];
    }
}
