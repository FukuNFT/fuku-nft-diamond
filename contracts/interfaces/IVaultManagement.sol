// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IVaultManagement {
    event VaultRegistered(bytes12 vaultName, address vaultAddress);

    event VaultUnregistered(bytes12 vaultName);

    event VaultUpgraded(bytes12 vaultName, address newImplementation);

    function registerVault(bytes12 vaultName, address vaultAddress) external;

    function unregisterVault(bytes12 vaultName) external;

    function upgradeVault(bytes12 vaultName, address newVaultAddress) external;

    function getVault(bytes12 vaultName) external view returns (address);
}
