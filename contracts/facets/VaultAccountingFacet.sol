// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IVaultAccounting } from "../interfaces/facets/IVaultAccounting.sol";
import { IVault } from "../interfaces/IVault.sol";
import { LibStorage, VaultStorage, DepositsRewardsStorage } from "../libraries/LibStorage.sol";
import { LibVaultUtils } from "../libraries/LibVaultUtils.sol";

contract VaultAccountingFacet is IVaultAccounting {
    modifier updateReward(bytes12 vaultName, address account) {
        DepositsRewardsStorage storage drs = LibStorage.depositsRewardsStorage();

        drs.rewardPerTokenStored[vaultName] = rewardPerToken(vaultName);
        drs.lastUpdatetime[vaultName] = lastTimeRewardApplicable(vaultName);

        if (account != address(0)) {
            drs.rewards[vaultName][account] = earned(vaultName, account);
            drs.userRewardPerTokenPaid[vaultName][account];
        }

        _;
    }

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
        IVault(vaultAddress).depositLpToken(amount);
        vs.userVaultBalances[msg.sender][vaultName] += amount;

        emit DepositLpToken(msg.sender, vaultName, amount);
    }

    /**
     * @notice Withdraw ETH from the user's lp token in vault
     *
     * @param lpTokenAmount The amount to withdraw
     * @param vaultName The vault to withdraw from
     */
    function withdraw(uint256 lpTokenAmount, bytes12 vaultName) external override {
        VaultStorage storage vs = LibStorage.vaultStorage();

        address vaultAddress = vs.vaultAddresses[vaultName];
        require(vaultAddress != address(0), "Vault does not exist");

        // verify the user deposit information
        require(lpTokenAmount <= vs.userVaultBalances[msg.sender][vaultName], "Insufficient token balance");

        // update user balance
        vs.userVaultBalances[msg.sender][vaultName] -= lpTokenAmount;
        // withdraw from vault and send to recipient
        uint256 amountWithdrawn = IVault(vaultAddress).withdraw(lpTokenAmount, payable(msg.sender));

        emit Withdraw(msg.sender, vaultName, amountWithdrawn, lpTokenAmount);
    }

    /**
     * @notice Withdraw user's LP tokens from the vault
     *
     * @param lpTokenAmount The amount of LP tokens to withdraw
     * @param vaultName The vault to withdraw from
     */
    function withdrawLpToken(uint256 lpTokenAmount, bytes12 vaultName) external override {
        VaultStorage storage vs = LibStorage.vaultStorage();

        address vaultAddress = vs.vaultAddresses[vaultName];
        require(vaultAddress != address(0), "Vault does not exist");

        // verify the user deposit information
        require(lpTokenAmount <= vs.userVaultBalances[msg.sender][vaultName], "Insufficient token balance");

        // update user balance
        vs.userVaultBalances[msg.sender][vaultName] -= lpTokenAmount;
        // withdraw from vault and send to recipient
        IVault(vaultAddress).withdrawLpToken(lpTokenAmount, payable(msg.sender));

        emit WithdrawLpToken(msg.sender, vaultName, lpTokenAmount);
    }

    /**
     * @notice Claim the rewards owed for a vault
     *
     * @param vaultName The vault name
     */
    function getReward(bytes12 vaultName) external override {}

    /**
     * @notice Notify the reward amount
     *
     * @param vaultName The vault name
     * @param reward The reward amount
     */
    function notifyRewardAmount(bytes12 vaultName, uint256 reward) external override {}

    /**
     * @notice Queries the user's lp token balance for a vault
     *
     * @param user The user to query for
     * @param vaultName The vault to query for
     */
    function userLPTokenBalance(address user, bytes12 vaultName) external view override returns (uint256) {
        return LibVaultUtils.getUserLpTokenBalance(user, vaultName);
    }

    /**
     * @notice Queries the user's eth balance for a vault
     *
     * @param user The user to query for
     * @param vaultName The vault to query for
     */
    function userETHBalance(address user, bytes12 vaultName) external view override returns (uint256) {
        return LibVaultUtils.getUserEthBalance(user, vaultName);
    }

    /**
     * @notice Queries the user's earned rewards for a vault
     *
     * @param vaultName The vault name
     * @param account The user's address
     */
    function earned(bytes12 vaultName, address account) public view override returns (uint256) {}

    /**
     * @notice Calculates the reward per token
     *
     * @param vaultName The vault name
     */
    function rewardPerToken(bytes12 vaultName) public view override returns (uint256) {}

    /**
     * @notice Calculates the last time reward applicable
     *
     * @param vaultName The vault name
     */
    function lastTimeRewardApplicable(bytes12 vaultName) public view override returns (uint256) {}
}
