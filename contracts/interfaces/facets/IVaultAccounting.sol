// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IVaultAccounting {
    event DepositEth(address indexed user, bytes12 indexed vaultName, uint256 amountEth, uint256 amountLp);

    event DepositLpToken(address indexed user, bytes12 indexed vaultName, uint256 amountLp);

    event Withdraw(address indexed user, bytes12 indexed vaultName, uint256 amountEth, uint256 amountLp);

    event WithdrawLpToken(address indexed user, bytes12 indexed vaultName, uint256 amountLp);

    event RewardAdded(bytes12 vaultName, uint256 reward);

    event RewardPaid(bytes12 vaultName, address indexed user, uint256 reward);

    event RewardsDurationUpdated(bytes12 vaultName, uint256 newDuration);

    function deposit(bytes12 vaultName) external payable;

    function depositLpToken(bytes12 vaultName, uint256 amount) external;

    function withdraw(uint256 lpTokenAmount, bytes12 vaultName) external;

    function withdrawLpToken(uint256 lpTokenAmount, bytes12 vault) external;

    function getReward(bytes12 vaultName) external;

    function notifyRewardAmount(bytes12 vaultName, uint256 reward) external;

    function setRewardsDuration(bytes12 vaultName, uint256 duration) external;

    function userLPTokenBalance(address user, bytes12 vaultName) external view returns (uint256);

    function userETHBalance(address user, bytes12 vaultName) external view returns (uint256);

    function earned(bytes12 vaultName, address account) external view returns (uint256);

    function rewardPerToken(bytes12 vaultName) external view returns (uint256);

    function lastTimeRewardApplicable(bytes12 vaultName) external view returns (uint256);
}
