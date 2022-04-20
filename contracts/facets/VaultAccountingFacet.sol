// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IVaultAccounting } from "../interfaces/facets/IVaultAccounting.sol";
import { IVault } from "../interfaces/IVault.sol";
import { LibStorage, VaultStorage, DepositsRewardsStorage, TokenAddressStorage } from "../libraries/LibStorage.sol";
import { LibVaultUtils } from "../libraries/LibVaultUtils.sol";
import { LibDiamond } from "../vendor/libraries/LibDiamond.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract VaultAccountingFacet is IVaultAccounting {
    /**
     * @notice Enforces only diamond owner can call function
     */
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }

    /**
     * @notice Updates the rewards
     */
    modifier updateReward(bytes12 vaultName, address account) {
        VaultStorage storage vs = LibStorage.vaultStorage();
        DepositsRewardsStorage storage drs = LibStorage.depositsRewardsStorage();

        address vaultAddress = vs.vaultAddresses[vaultName];
        require(vaultAddress != address(0), "Vault does not exist");

        drs.rewardPerTokenStored[vaultName] = rewardPerToken(vaultName);
        drs.lastUpdateTime[vaultName] = lastTimeRewardApplicable(vaultName);

        if (account != address(0)) {
            drs.rewards[vaultName][account] = earned(vaultName, account);
            drs.userRewardPerTokenPaid[vaultName][account] = drs.rewardPerTokenStored[vaultName];
        }

        _;
    }

    /**
     * @notice Deposits ETH into vault
     * @dev Main point of entry into the marketplace
     *
     * @param vaultName The name of the vault as registered in the registry
     */
    function deposit(bytes12 vaultName) external payable override updateReward(vaultName, msg.sender) {
        VaultStorage storage vs = LibStorage.vaultStorage();

        address vaultAddress = vs.vaultAddresses[vaultName];

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
    function depositLpToken(bytes12 vaultName, uint256 amount) external override updateReward(vaultName, msg.sender) {
        VaultStorage storage vs = LibStorage.vaultStorage();

        address vaultAddress = vs.vaultAddresses[vaultName];

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
    function withdraw(uint256 lpTokenAmount, bytes12 vaultName) external override updateReward(vaultName, msg.sender) {
        VaultStorage storage vs = LibStorage.vaultStorage();

        address vaultAddress = vs.vaultAddresses[vaultName];

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
    function withdrawLpToken(uint256 lpTokenAmount, bytes12 vaultName)
        external
        override
        updateReward(vaultName, msg.sender)
    {
        VaultStorage storage vs = LibStorage.vaultStorage();

        address vaultAddress = vs.vaultAddresses[vaultName];

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
    function getReward(bytes12 vaultName) external override updateReward(vaultName, msg.sender) {
        DepositsRewardsStorage storage drs = LibStorage.depositsRewardsStorage();
        TokenAddressStorage storage tas = LibStorage.tokenAddressStorage();

        uint256 reward = drs.rewards[vaultName][msg.sender];

        if (reward > 0) {
            drs.rewards[vaultName][msg.sender] = 0;
            IERC20(tas.fukuToken).transfer(msg.sender, reward);
            emit RewardPaid(vaultName, msg.sender, reward);
        }
    }

    /**
     * @notice Notify the reward amount
     *
     * @param vaultName The vault name
     * @param reward The reward amount
     */
    function notifyRewardAmount(bytes12 vaultName, uint256 reward)
        external
        override
        onlyOwner
        updateReward(vaultName, address(0))
    {
        DepositsRewardsStorage storage drs = LibStorage.depositsRewardsStorage();
        TokenAddressStorage storage tas = LibStorage.tokenAddressStorage();

        // transfer in reward amount
        // todo: state variable to keep track of how much is allocated?
        IERC20(tas.fukuToken).transferFrom(msg.sender, address(this), reward);

        if (block.timestamp >= drs.periodFinish[vaultName]) {
            drs.rewardRate[vaultName] = reward / drs.rewardsDuration[vaultName];
        } else {
            uint256 remaining = drs.periodFinish[vaultName] - block.timestamp;
            uint256 leftover = remaining * drs.rewardRate[vaultName];
            drs.rewardRate[vaultName] = reward + leftover / drs.rewardsDuration[vaultName];
        }

        drs.lastUpdateTime[vaultName] = block.timestamp;
        drs.periodFinish[vaultName] = block.timestamp + drs.rewardsDuration[vaultName];

        emit RewardAdded(vaultName, reward);
    }

    /**
     * @notice Sets the rewards duration
     *
     * @param vaultName The vault name
     * @param duration The duration
     */
    function setRewardsDuration(bytes12 vaultName, uint256 duration) external override onlyOwner {
        DepositsRewardsStorage storage drs = LibStorage.depositsRewardsStorage();

        require(block.timestamp > drs.periodFinish[vaultName], "Previous rewards period not ended");
        drs.rewardsDuration[vaultName] = duration;

        emit RewardsDurationUpdated(vaultName, duration);
    }

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
    function earned(bytes12 vaultName, address account) public view override returns (uint256) {
        VaultStorage storage vs = LibStorage.vaultStorage();
        DepositsRewardsStorage storage drs = LibStorage.depositsRewardsStorage();

        return
            (vs.userVaultBalances[account][vaultName] *
                (rewardPerToken(vaultName) - drs.userRewardPerTokenPaid[vaultName][account])) /
            1e18 +
            drs.rewards[vaultName][account];
    }

    /**
     * @notice Calculates the reward per token
     *
     * @param vaultName The vault name
     */
    function rewardPerToken(bytes12 vaultName) public view override returns (uint256) {
        DepositsRewardsStorage storage drs = LibStorage.depositsRewardsStorage();

        uint256 totalSupply = LibVaultUtils.getTotalVaultHoldings(vaultName);

        if (totalSupply == 0) {
            return drs.rewardPerTokenStored[vaultName];
        }

        return
            drs.rewardPerTokenStored[vaultName] +
            (
                ((((lastTimeRewardApplicable(vaultName) - drs.lastUpdateTime[vaultName]) * drs.rewardRate[vaultName]) *
                    1e18) / totalSupply)
            );
    }

    /**
     * @notice Calculates the last time reward applicable
     *
     * @param vaultName The vault name
     */
    function lastTimeRewardApplicable(bytes12 vaultName) public view override returns (uint256) {
        DepositsRewardsStorage storage drs = LibStorage.depositsRewardsStorage();

        return block.timestamp < drs.periodFinish[vaultName] ? block.timestamp : drs.periodFinish[vaultName];
    }
}
