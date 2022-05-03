// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { BaseVault } from "../vaults/BaseVault.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TestLpTokenVault is BaseVault {
    address private lpToken;

    constructor(address _diamond, address _lpToken) BaseVault(_diamond) {
        lpToken = _lpToken;
    }

    function deposit() external payable override returns (uint256) {
        revert("Disabled.");
    }

    function depositLpToken(uint256 amount, address user) external override {
        IERC20(lpToken).transferFrom(user, address(this), amount);
    }

    function withdraw(uint256, address payable) external pure override returns (uint256) {
        revert("Disabled.");
    }

    function withdrawLpToken(uint256 lpTokenAmount, address recipient) external override {
        IERC20(lpToken).transfer(recipient, lpTokenAmount);
    }

    function transferFunds(address payable) external pure override {
        revert("Disabled.");
    }

    function getAmountETH(uint256 lpTokenAmount) external pure override returns (uint256) {
        return lpTokenAmount; // not actually the case just need to test
    }

    function getAmountLpTokens(uint256 ethAmount) external pure override returns (uint256) {
        return ethAmount; // not actually the case just need to test
    }

    function getLpToken() external view override returns (address) {
        return lpToken;
    }
}
