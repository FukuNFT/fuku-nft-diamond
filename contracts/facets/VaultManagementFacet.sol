// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IVaultManagement } from "../interfaces/IVaultManagement.sol";
import { IVault } from "../interfaces/IVault.sol";
import { LibStorage, VaultStorage } from "../libraries/LibStorage.sol";

contract VaultManagementFacet is IVaultManagement {
    function registerVault(bytes12 vaultName, address vaultAddress) external override {
        VaultStorage storage vs = LibStorage.vaultStorage();

        require(vs.vaultAddresses[vaultName] == address(0), "Vault already registered");

        // add to vaultNames and create the mapping
        vs.vaultNames.push(vaultName);
        vs.vaultAddresses[vaultName] = vaultAddress;
    }

    function unregisterVault(bytes12 vaultName) external override {
        VaultStorage storage vs = LibStorage.vaultStorage();

        require(vs.vaultAddresses[vaultName] != address(0), "Vault already unregistered");
        vs.vaultAddresses[vaultName] = address(0);
    }

    function upgradeVault(bytes12 vaultName, address newVaultAddress) external override {
        VaultStorage storage vs = LibStorage.vaultStorage();

        address oldVaultAddress = vs.vaultAddresses[vaultName];
        require(oldVaultAddress != address(0), "Vault already unregistered");

        // transfer lp tokens to new vault address
        IVault(oldVaultAddress).transferFunds(payable(newVaultAddress));

        // unregister old vault
        vs.vaultAddresses[vaultName] = newVaultAddress;
    }
}
