// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IVaultManagement } from "../interfaces/facets/IVaultManagement.sol";
import { IVault } from "../interfaces/IVault.sol";
import { LibStorage, VaultStorage } from "../libraries/LibStorage.sol";
import { LibDiamond } from "../vendor/libraries/LibDiamond.sol";

contract VaultManagementFacet is IVaultManagement {
    /**
     * @notice Enforces only diamond owner can call function
     */
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }

    /**
     * @notice Registers a vault to enable its use
     * @dev Will revert if vaultName is already registered
     *
     * @param vaultName The vault name
     * @param vaultAddress The address of the vault
     */
    function registerVault(bytes12 vaultName, address vaultAddress) external override onlyOwner {
        VaultStorage storage vs = LibStorage.vaultStorage();

        require(vs.vaultAddresses[vaultName] == address(0), "Vault already registered");

        vs.vaultAddresses[vaultName] = vaultAddress;

        emit VaultRegistered(vaultName, vaultAddress);
    }

    /**
     * @notice Unregisters a vault to disable its use
     *
     * @param vaultName The vault name
     */
    function unregisterVault(bytes12 vaultName) external override onlyOwner {
        VaultStorage storage vs = LibStorage.vaultStorage();

        require(vs.vaultAddresses[vaultName] != address(0), "Vault already unregistered");
        delete vs.vaultAddresses[vaultName];

        emit VaultUnregistered(vaultName);
    }

    /**
     * @notice Upgrades the vault to new implementation
     * @dev Will transfer all lp tokens in old implementation to the new
     *
     * @param vaultName The name of the vault
     * @param newVaultAddress The new vault implementation address
     */
    function upgradeVault(bytes12 vaultName, address newVaultAddress) external override onlyOwner {
        VaultStorage storage vs = LibStorage.vaultStorage();

        address oldVaultAddress = vs.vaultAddresses[vaultName];
        require(oldVaultAddress != address(0), "Vault already unregistered");

        // transfer lp tokens to new vault address
        IVault(oldVaultAddress).transferFunds(payable(newVaultAddress));

        // unregister old vault
        vs.vaultAddresses[vaultName] = newVaultAddress;

        emit VaultUpgraded(vaultName, newVaultAddress);
    }

    /**
     * @notice Getter function for vaults
     *
     * @param vaultName The name of the vault
     * @return The address of the vault
     */
    function getVault(bytes12 vaultName) external view override returns (address) {
        VaultStorage storage vs = LibStorage.vaultStorage();

        return vs.vaultAddresses[vaultName];
    }
}
