// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract RocketPoolVaultStorage {
    //stores the current vault implementation
    address currentImplementation;

    mapping(bytes32 => address) delegate;

    modifier onlyCurrentImplementation() {
        require(msg.sender == currentImplementation, "Only the current implementation can call function");
        _;
    }

    constructor(address _currentImplemntation) {
        currentImplementation = _currentImplemntation;
    }

    function getCurrentImplementation() public view returns (address) {
        return currentImplementation;
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
