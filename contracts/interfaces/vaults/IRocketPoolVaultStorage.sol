// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.0;

interface IRocketPoolVaultStorage {
    function setDelegateAddress(address user, address delegateAddress) external;

    function getDelegateAddress(address user) external view returns (address);
}
