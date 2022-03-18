// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IVault {
    function deposit() external payable returns (uint256);

    function depositLpToken(address user, uint256 amount) external returns (uint256);

    function withdraw(uint256 lpTokenAmount, address payable recipient) external returns (uint256);

    function transferFunds(address payable newVaultAddress) external;

    function getAmountETH(uint256 lpTokenAmount) external view returns (uint256);

    function getAmountLpTokens(uint256 ethAmount) external view returns (uint256);
}
