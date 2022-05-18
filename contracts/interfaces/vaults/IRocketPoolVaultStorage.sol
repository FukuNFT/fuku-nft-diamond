// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.0;

interface IRocketPoolVaultStorage {
    function getCurrentImplementation() external view returns (address);

    function setNewImplementation(address newImplementation) external;

    function setDelegateAddress(address user, address delegateAddress) external;

    function getDelegateAddress(address user) external view returns (address);
}
