// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IVaultAccounting } from "../interfaces/IVaultAccounting.sol";
import { IVault } from "../interfaces/IVault.sol";
import { LibStorage, VaultStorage } from "../libraries/LibStorage.sol";

contract VaultAccountingFacet is IVaultAccounting {
    function deposit(bytes12 vaultName) external payable override {
        VaultStorage storage vs = LibStorage.vaultStorage();

        address vaultAddress = vs.vaultAddresses[vaultName];
        require(vaultAddress != address(0), "Vault does not exist");

        // deposit into vault on behalf of sender
        uint256 lpTokensAmount = IVault(vaultAddress).deposit{ value: msg.value }();
        vs.userVaultBalances[msg.sender][vaultName] += lpTokensAmount;
    }

    function withdraw(
        bytes12 vaultName,
        address payable recipient,
        uint256 lpTokensAmount
    ) external override {
        VaultStorage storage vs = LibStorage.vaultStorage();

        address vaultAddress = vs.vaultAddresses[vaultName];
        require(vaultAddress != address(0), "Vault does not exist");

        // withdraw from vault and send to recipient
        vs.userVaultBalances[msg.sender][vaultName] -= lpTokensAmount;
        IVault(vaultAddress).withdraw(lpTokensAmount, recipient);
    }

    function userBalance(address user, bytes12 vaultName) external view override returns (uint256) {
        VaultStorage storage vs = LibStorage.vaultStorage();

        return vs.userVaultBalances[user][vaultName];
    }
}
