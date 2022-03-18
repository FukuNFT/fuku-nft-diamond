// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IVaultAccounting {
    event DepositEth(address indexed user, bytes12 indexed vaultName, uint256 amountEth, uint256 amountLp);

    event DepositLpToken(address indexed user, bytes12 indexed vaultName, uint256 amountLp);

    event Withdraw(address indexed user, bytes12 indexed vaultName, uint256 amountEth, uint256 amountLpBurned);

    function deposit(bytes12 vaultName) external payable;

    function depositLpToken(bytes12 vaultName, uint256 amount) external;

    function withdraw(uint256 lpTokensAmount, bytes12 vaultName) external;

    function userBalance(address user, bytes12 vaultName) external view returns (uint256);
}
