// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IVaultManagement {
    function registerVault(bytes12 vaultName, address vaultAddress) external;

    function unregisterVault(bytes12 vaultName) external;

    function upgradeVault(bytes12 vaultName, address newVaultAddress) external;
}
