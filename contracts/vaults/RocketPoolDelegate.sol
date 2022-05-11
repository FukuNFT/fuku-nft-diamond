// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { BaseDelegate } from "./BaseDelegate.sol";
import { RocketDepositPoolInterface } from "../interfaces/vaults/RocketDepositPoolInterface.sol";
import { RocketTokenRETHInterface } from "../interfaces/vaults/RocketTokenRETHInterface.sol";

contract RocketVaultDelegate is BaseDelegate {
    constructor(address _rocketStorageAddress, address _rocketPoolVaultStorageAddress)
        BaseDelegate(_rocketStorageAddress, _rocketPoolVaultStorageAddress)
    {
        // do we need to store the depositor's address?
    }

    function deposit() external payable override onlyCurrentImplementation nonReentrant returns (uint256) {
        // Load contracts
        address depositPoolAddress = rocketStorage.getAddress(
            keccak256(abi.encodePacked("contract.address", "rocketDepositPool"))
        );
        RocketDepositPoolInterface depositPool = RocketDepositPoolInterface(depositPoolAddress);
        address rethAddress = rocketStorage.getAddress(
            keccak256(abi.encodePacked("contract.address", "rocketTokenRETH"))
        );
        RocketTokenRETHInterface rETH = RocketTokenRETHInterface(rethAddress);

        // Get amount of tokens before and after to determine how many were minted
        uint256 balanceBefore = rETH.balanceOf(address(this));
        depositPool.deposit{ value: msg.value }();
        uint256 balanceAfter = rETH.balanceOf(address(this));

        uint256 sharesMinted = balanceAfter - balanceBefore;

        return sharesMinted;
    }

    function depositLpToken(uint256 amount, address user) external override onlyCurrentImplementation nonReentrant {
        // Load rETH contract
        address rethAddress = rocketStorage.getAddress(
            keccak256(abi.encodePacked("contract.address", "rocketTokenRETH"))
        );
        RocketTokenRETHInterface rETH = RocketTokenRETHInterface(rethAddress);

        rETH.transferFrom(user, address(this), amount);
    }

    function withdraw(uint256 lpTokenAmount, address payable recipient)
        external
        override
        onlyCurrentImplementation
        nonReentrant
        returns (uint256)
    {
        // Load contracts
        address rethAddress = rocketStorage.getAddress(
            keccak256(abi.encodePacked("contract.address", "rocketTokenRETH"))
        );
        RocketTokenRETHInterface rETH = RocketTokenRETHInterface(rethAddress);

        // Redeem rETH for ETH and send to recipient
        uint256 balanceBefore = address(this).balance;
        rETH.burn(lpTokenAmount);
        uint256 balanceAfter = address(this).balance;

        uint256 ethReturned = balanceAfter - balanceBefore;

        recipient.transfer(ethReturned);

        return ethReturned;
    }

    function withdrawLpToken(uint256 lpTokenAmount, address recipient)
        external
        override
        onlyCurrentImplementation
        nonReentrant
    {
        // Load rETH contract
        address rethAddress = rocketStorage.getAddress(
            keccak256(abi.encodePacked("contract.address", "rocketTokenRETH"))
        );
        RocketTokenRETHInterface rETH = RocketTokenRETHInterface(rethAddress);

        rETH.transfer(recipient, lpTokenAmount);
    }
}
