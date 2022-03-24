// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IVaultAccounting {
    event DepositEth(address indexed user, bytes12 indexed vaultName, uint256 amountEth, uint256 amountShares);

    event DepositVaultToken(address indexed user, bytes12 indexed vaultName, uint256 amountShares);

    event Withdraw(address indexed user, bytes12 indexed vaultName, uint256 amountEth, uint256 amountShares);

    event WithdrawVaultToken(address indexed user, bytes12 indexed vaultName, uint256 amountShares);

    function deposit(bytes12 vaultName) external payable;

    function depositVaultToken(bytes12 vaultName, uint256 amount) external;

    function withdraw(uint256 ethAmount, bytes12 vaultName) external;

    function withdrawVaultToken(uint256 vaultShares, bytes12 vault) external;

    function userVaultTokenBalance(address user, bytes12 vaultName) external view returns (uint256);

    function userETHBalance(address user, bytes12 vaultName) external view returns (uint256);
}
