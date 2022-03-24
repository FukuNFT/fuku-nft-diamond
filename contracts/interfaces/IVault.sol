// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./IERC4626.sol";

interface IVault is IERC4626 {
    /**
     * @dev Deposits ETH and mints the vault's share token
     *
     * @param recipient The recipient of the newly minted share tokens
     * @return The amount of vault tokens minted
     */
    function depositEth(address recipient) external payable returns (uint256);

    /**
     * @dev Withdraws ETH and burns the vault's share token
     *
     * @param amount The amount of ETH to withdraw
     * @param recipient The recipient of the converted ETH
     * @param owner The owner of the vault tokens to burn
     * @return The amount of vault tokens burned
     */
    function withdrawEth(
        uint256 amount,
        address receiver,
        address owner
    ) external returns (uint256);

    /**
     * @dev Transfers LP tokens to new vault
     *
     * @param newVaultAddress The new vault which will receive the LP tokens
     */
    function transferFunds(address payable newVaultAddress) external;

    /**
     * @dev Gets the conversion from vault token to ETH
     *
     * @param shares The amount of shares of vault token
     * @return The amount of ETH equivalent to given amount of vault tokens
     */
    function convertSharesToEth(uint256 shares) external view returns (uint256);

    /**
     * @dev Gets the conversion from ETH to vault token
     *
     * @param ethAmount The ETH amount
     * @return The amount of vault tokens equivalent to given amount of ETH
     */
    function convertEthToShares(uint256 ethAmount) external view returns (uint256);
}
