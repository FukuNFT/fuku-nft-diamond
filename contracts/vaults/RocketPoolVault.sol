// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { BaseVault } from "./BaseVault.sol";
import { RocketDepositPoolInterface } from "../interfaces/vaults/RocketDepositPoolInterface.sol";
import { RocketTokenRETHInterface } from "../interfaces/vaults/RocketTokenRETHInterface.sol";
import { RocketStorageInterface } from "../interfaces/vaults/RocketStorageInterface.sol";

contract RocketVault is BaseVault {
    // stores state for Rocket Protocol
    RocketStorageInterface rocketStorage;

    constructor (address _diamond, address _rocketStorageAddress) BaseVault(_diamond) {
        rocketStorage = RocketStorageInterface(_rocketStorageAddress);
    }

    function deposit() external payable override onlyDiamond nonReentrant returns (uint256) {
        // Load contracts
        address depositPoolAddress = rocketStorage.getAddress(keccak256(abi.encodePacked("contract.address", "rocketDepositPool")));
        RocketDepositPoolInterface depositPool = RocketDepositPoolInterface(depositPoolAddress);
        address rethAddress = rocketStorage.getAddress(keccak256(abi.encodePacked("contract.address", "rocketETHToken")));
        RocketTokenRETHInterface rETH = RocketTokenRETHInterface(rethAddress);

        // Get amount of tokens before and after to determine how many were minted
        uint256 balanceBefore = rETH.balanceOf(address(this));
        depositPool.deposit{ value: msg.value }();
        uint256 balanceAfter = rETH.balanceOf(address(this));

        uint256 sharesMinted = balanceAfter - balanceBefore;

        return sharesMinted;
    }

    function depositLpToken(uint256 amount, address user) external override onlyDiamond nonReentrant {
        // Load rETH contract
        address rethAddress = rocketStorage.getAddress(keccak256(abi.encodePacked("contract.address", "rocketETHToken")));
        RocketTokenRETHInterface rETH = RocketTokenRETHInterface(rethAddress);

        rETH.transferFrom(user, address(this), amount);
    }

    function withdraw(uint256 lpTokenAmount, address payable recipient) external override onlyDiamond nonReentrant returns (uint256) {
        // Load contracts
        address rethAddress = rocketStorage.getAddress(keccak256(abi.encodePacked("contract.address", "rocketETHToken")));
        RocketTokenRETHInterface rETH = RocketTokenRETHInterface(rethAddress);

        // check that rocketVault has enough ETH to handle withdrawal
        uint256 amountToWithdraw = rETH.getEthValue(lpTokenAmount);
        
        // Redeem rETH for ETH and send to recipient
        uint256 balanceBefore = address(this).balance;
        rETH.burn(lpTokenAmount);
        uint256 balanceAfter = address(this).balance;

        uint256 ethReturned = balanceAfter - balanceBefore;

        recipient.transfer(ethReturned);

        return ethReturned;
    }

    function withdrawLpToken (uint256 lpTokenAmount, address recipient) external override onlyDiamond nonReentrant {
        // Load rETH contract
        address rethAddress = rocketStorage.getAddress(keccak256(abi.encodePacked("contract.address", "rocketETHToken")));
        RocketTokenRETHInterface rETH = RocketTokenRETHInterface(rethAddress);

        rETH.transferFrom(address(this), recipient, lpTokenAmount);
    }

    function transferFunds(address payable newVaultAddress) external override onlyDiamond {
        // Load rETH contract
        address rethAddress = rocketStorage.getAddress(keccak256(abi.encodePacked("contract.address", "rocketETHToken")));
        RocketTokenRETHInterface rETH = RocketTokenRETHInterface(rethAddress);

        // redeem all rETH
        rETH.burn(rETH.balanceOf(address(this)));
        newVaultAddress.transfer(address(this).balance);
    }

    function getAmountETH(uint256 lpTokenAmount) external view override returns (uint256) {
        // Load rocketVault address and rETH contract
        address rocketVault = rocketStorage.getAddress(keccak256(abi.encodePacked("contract.address", "rocketVault")));
        address rethAddress = rocketStorage.getAddress(keccak256(abi.encodePacked("contract.address", "rocketETHToken")));
        RocketTokenRETHInterface rETH = RocketTokenRETHInterface(rethAddress);

        uint256 ethAmount = rETH.getEthValue(lpTokenAmount);

        // check if rocket vault has enough to withdraw, if not return rocket vault balance 
        if (rocketVault.balance >= ethAmount) {
            return ethAmount;
        } else {
            return rocketVault.balance;
        }
    }

    function getAmountLpTokens(uint256 ethAmount) external view override returns (uint256) {
        // Load rETH contract
        address rethAddress = rocketStorage.getAddress(keccak256(abi.encodePacked("contract.address", "rocketETHToken")));
        RocketTokenRETHInterface rETH = RocketTokenRETHInterface(rethAddress);

        return rETH.getRethValue(ethAmount);
    }

    function getLpToken() external view override returns (address) {
        return rocketStorage.getAddress(keccak256(abi.encodePacked("contract.address", "rocketETHToken")));
    }
}