// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IVaultAccounting } from "../interfaces/facets/IVaultAccounting.sol";
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
        uint256 lpTokensAmount = IVault(vaultAddress).depositEth{ value: msg.value }(address(this));
        vs.userVaultBalances[msg.sender][vaultName] += lpTokensAmount;

        emit DepositEth(msg.sender, vaultName, msg.value, lpTokensAmount);
    }

    /**
     * @notice Deposits vault tokens to allow for bidding
     * @dev Main point of entry into the marketplace
     *
     * @param vaultName The name of the vault as registered in the registry
     * @param amount The amount of vault tokens to deposit
     */
    function depositVaultToken(bytes12 vaultName, uint256 amount) external override {
        VaultStorage storage vs = LibStorage.vaultStorage();

        address vaultAddress = vs.vaultAddresses[vaultName];
        require(vaultAddress != address(0), "Vault does not exist");

        // deposit into vault on behalf of sender
        //IVault(vaultAddress).depositLpToken(amount);
        vs.userVaultBalances[msg.sender][vaultName] += amount;

        emit DepositVaultToken(msg.sender, vaultName, amount);
    }

    /**
     * @notice Withdraw ETH from the vault on the user's behalf
     *
     * @param ethAmount The amount of ETH to withdraw
     * @param vaultName The vault to withdraw from
     */
    function withdraw(uint256 ethAmount, bytes12 vaultName) external override {
        VaultStorage storage vs = LibStorage.vaultStorage();

        address vaultAddress = vs.vaultAddresses[vaultName];
        require(vaultAddress != address(0), "Vault does not exist");

        // verify the user deposit information
        uint256 lpTokenAmount = IVault(vaultAddress).convertEthToShares(ethAmount);
        require(lpTokenAmount <= vs.userVaultBalances[msg.sender][vaultName], "Insufficient token balance");

        // update user balance
        vs.userVaultBalances[msg.sender][vaultName] -= lpTokenAmount;
        // withdraw from vault and send to recipient
        uint256 amountWithdrawn = IVault(vaultAddress).withdrawEth(lpTokenAmount, msg.sender, address(this));

        emit Withdraw(msg.sender, vaultName, amountWithdrawn, lpTokenAmount);
    }

    /**
     * @notice Withdraw user's vault tokens
     *
     * @param vaultShares The amount of vault token shares to withdraw
     * @param vaultName The vault to withdraw from
     */
    function withdrawVaultToken(uint256 vaultShares, bytes12 vaultName) external override {
        VaultStorage storage vs = LibStorage.vaultStorage();

        address vaultAddress = vs.vaultAddresses[vaultName];
        require(vaultAddress != address(0), "Vault does not exist");

        // verify the user deposit information
        require(vaultShares <= vs.userVaultBalances[msg.sender][vaultName], "Insufficient token balance");

        // update user balance
        vs.userVaultBalances[msg.sender][vaultName] -= vaultShares;
        // withdraw from vault and send to recipient
        //IVault(vaultAddress).withdrawLpToken(vaultShares, payable(msg.sender));

        emit WithdrawVaultToken(msg.sender, vaultName, vaultShares);
    }

    /**
     * @notice Returns how many vault tokens the user has deposited
     *
     * @param user The user to query for
     * @param vaultName The vault to query for
     */
    function userVaultTokenBalance(address user, bytes12 vaultName) external view override returns (uint256) {
        return LibVaultUtils.getUserLpTokenBalance(user, vaultName);
    }

    /**
     * @notice Returns a user's balance in ETH for the amount of vault tokens deposited
     *
     * @param user The user to query for
     * @param vaultName The vault to query for
     */
    function userETHBalance(address user, bytes12 vaultName) external view override returns (uint256) {
        return LibVaultUtils.getUserEthBalance(user, vaultName);
    }
}
