// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IVault } from "../interfaces/IVault.sol";

contract EmptyVaultUpgrade is IVault {
    function deposit() external payable override returns (uint256) {
        // nothing to do

        return msg.value;
    }

    function depositLpToken(address user, uint256 amount) external override returns (uint256) {
        revert("Disabled.");
    }

    function withdraw(uint256 lpTokenAmount, address payable recipient) external override returns (uint256) {
        recipient.transfer(lpTokenAmount);

        return lpTokenAmount;
    }

    function getAmountETH(uint256 lpTokenAmount) external pure override returns (uint256) {
        return lpTokenAmount;
    }

    function getAmountLpTokens(uint256 ethAmount) external pure override returns (uint256) {
        return ethAmount;
    }

    function transferFunds(address payable newVaultAddress) external override {
        newVaultAddress.transfer(address(this).balance);
    }

    receive() external payable {}
}
