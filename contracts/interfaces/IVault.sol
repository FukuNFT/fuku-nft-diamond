// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IVault {
    /**
     * @dev Deposits ETH and converts to vault's LP token
     *
     * @return The amount of LP tokens received from ETH deposit
     */
    function deposit() external payable returns (uint256);

    /**
     * @dev Deposits LP token directly into vault
     *
     * @param user The user depositing 
     * @param amount The amount of LP tokens to deposit
     */
    function depositLpToken(uint256 amount, address user) external;

    /**
     * @dev Converts LP token and withdraws as ETH
     *
     * @param lpTokenAmount The amount of LP tokens to withdraw before converting
     * @param recipient The recipient of the converted ETH
     * @return The amount of ETH withdrawn
     */
    function withdraw(uint256 lpTokenAmount, address payable recipient) external returns (uint256);

    /**
     * @dev Withdraws LP token directly from vault
     *
     * @param lpTokenAmount The amount of LP tokens to withdraw
     * @param recipient The recipient of the LP tokens
     */
    function withdrawLpToken(uint256 lpTokenAmount, address recipient) external;

    /**
     * @dev Transfers LP tokens to new vault
     *
     * @param newVaultAddress The new vault which will receive the LP tokens
     */
    function transferFunds(address payable newVaultAddress) external;

    /**
     * @dev Gets the conversion from LP token to ETH
     *
     * @param lpTokenAmount The LP token amount
     */
    function getAmountETH(uint256 lpTokenAmount) external view returns (uint256);

    /**
     * @dev Gets the conversion from ETH to LP token
     *
     * @param ethAmount The ETH amount
     */
    function getAmountLpTokens(uint256 ethAmount) external view returns (uint256);

    /**
     * @dev Get the LP token address of the vault
     */
    function getLpToken() external view returns (address);
}
