// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IVaultAccounting {
    function deposit(bytes12 vaultName) external payable;

    function withdraw(
        bytes12 vaultName,
        address payable recipient,
        uint256 amount
    ) external;

    function userBalance(address user, bytes12 vaultName) external view returns (uint256);
}
