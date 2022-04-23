// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { BaseVault } from "./BaseVault.sol";
import { RocketDepositPoolInterface } from "../interfaces/RocketDepositPoolInterface.sol";
import { RocketTokenRETHInterface } from "../interfaces/RocketTokenRETHInterface.sol";

contract RocketVault is BaseVault {

    RocketDepositPoolInterface depositPool;
    RocketTokenRETHInterface rETH;

    constructor (address _diamond, address _rETHAddress, address _depositPool) BaseVault(_diamond) {
        depositPool = RocketDepositPoolInterface(_depositPool);
        rETH = RocketTokenRETHInterface(_rETHAddress);
    }

    function deposit() external payable override onlyDiamond nonReentrant returns (uint256) {
        // Get amount of tokens before and after to determine how many were minted
        uint256 balanceBefore = rETH.balanceOf(address(this));
        depositPool.deposit{ value: msg.value }();
        uint256 balanceAfter = rETH.balanceOf(address(this));

        uint256 sharesMinted = balanceAfter - balanceBefore;

        return sharesMinted;
    }

    function depositLpToken(uint256 amount, address user) external override onlyDiamond nonReentrant {
        rETH.transferFrom(user, address(this), amount);
    }

    function withdraw(uint256 lpTokenAmount, address payable recipient) external override onlyDiamond nonReentrant returns (uint256) {
        uint256 balanceBefore = address(this).balance;
        rETH.burn(lpTokenAmount);
        uint256 balanceAfter = address(this).balance;

        uint256 ethReturned = balanceAfter - balanceBefore;

        recipient.transfer(ethReturned);

        return ethReturned;
    }

    function withdrawLpToken (uint256 lpTokenAmount, address recipient) external override onlyDiamond nonReentrant {
        rETH.transferFrom(address(this), recipient, lpTokenAmount);
    }

    function transferFunds(address payable newVaultAddress) external override onlyDiamond {
        // redeem all rETH
        rETH.burn(rETH.balanceOf(address(this)));
        newVaultAddress.transfer(address(this).balance);
    }

    function getAmountETH(uint256 lpTokenAmount) external view override returns (uint256) {
        return rETH.getEthValue(lpTokenAmount);
    }

    function getAmountLpTokens(uint256 ethAmount) external view override returns (uint256) {
        return rETH.getRethValue(ethAmount);
    }

    function getLpToken() external view override returns (address) {
        return address(rETH);
    }
}