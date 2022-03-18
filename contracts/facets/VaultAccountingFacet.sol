// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IVaultAccounting } from "../interfaces/IVaultAccounting.sol";
import { IVault } from "../interfaces/IVault.sol";
import { LibStorage, VaultStorage } from "../libraries/LibStorage.sol";
import { LibVaultUtils } from "../libraries/LibVaultUtils.sol";

contract VaultAccountingFacet is IVaultAccounting {
    /**
     * @notice Deposits ETH into vault
     * @dev Main point of entry into the marketplace
     *
     * @param vaultName The name of the vault as registered in the registry
     */
    function deposit(bytes12 vaultName) external payable override {
        VaultStorage storage vs = LibStorage.vaultStorage();

        address vaultAddress = vs.vaultAddresses[vaultName];
        require(vaultAddress != address(0), "Vault does not exist");

        // deposit into vault on behalf of sender
        uint256 lpTokensAmount = IVault(vaultAddress).deposit{ value: msg.value }();
        vs.userVaultBalances[msg.sender][vaultName] += lpTokensAmount;

        emit DepositEth(msg.sender, vaultName, msg.value, lpTokensAmount);
    }

    /**
     * @notice Deposits LP tokens directly into vault
     * @dev Main point of entry into the marketplace
     *
     * @param vaultName The name of the vault as registered in the registry
     * @param amount The amount of LP tokens to deposit
     */
    function depositLpToken(bytes12 vaultName, uint256 amount) external override {
        VaultStorage storage vs = LibStorage.vaultStorage();

        address vaultAddress = vs.vaultAddresses[vaultName];
        require(vaultAddress != address(0), "Vault does not exist");

        // deposit into vault on behalf of sender
        uint256 lpTokensAmount = IVault(vaultAddress).depositLpToken(msg.sender, amount);
        vs.userVaultBalances[msg.sender][vaultName] += lpTokensAmount;

        emit DepositLpToken(msg.sender, vaultName, lpTokensAmount);
    }

    /**
     * @notice Withdraw ETH from the user's lp token in vault
     *
     * @param lpTokensAmount The amount to withdraw
     * @param vaultName The vault to withdraw from
     */
    function withdraw(uint256 lpTokensAmount, bytes12 vaultName) external override {
        VaultStorage storage vs = LibStorage.vaultStorage();

        address vaultAddress = vs.vaultAddresses[vaultName];
        require(vaultAddress != address(0), "Vault does not exist");

        // verify the user deposit information
        require(lpTokensAmount <= vs.userVaultBalances[msg.sender][vaultName], "Insufficient token balance");

        // update user balance
        vs.userVaultBalances[msg.sender][vaultName] -= lpTokensAmount;
        // withdraw from vault and send to recipient
        uint256 amountWithdrawn = IVault(vaultAddress).withdraw(lpTokensAmount, payable(msg.sender));

        emit Withdraw(msg.sender, vaultName, amountWithdrawn, lpTokensAmount);
    }

    /**
     * @notice Queries the user's lp token balance for a vault
     *
     * @param user The user the query for
     * @param vaultName The vault to query for
     */
    function userBalance(address user, bytes12 vaultName) external view override returns (uint256) {
        return LibVaultUtils.getUserLpTokenBalance(user, vaultName);
    }
}
