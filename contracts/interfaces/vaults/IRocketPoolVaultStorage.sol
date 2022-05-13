// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.0;

interface IRocketPoolVaultStorage {
    function getCurrentImplementation() external view returns (address);

    function setNewImplementation(address newImplementation) external;

    function setDelegateAddress(bytes32 _data, address delegateAddress) external;

    function getDelegateAddress(bytes32 _data) external view returns (address);
}
