// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IRocketDepositPool } from "../interfaces/vaults/IRocketDepositPool.sol";
import { IRocketTokenRETH } from "../interfaces/vaults/IRocketTokenRETH.sol";
import { IRocketDelegate } from "../interfaces/vaults/IRocketDelegate.sol";
import { IRocketStorage } from "../interfaces/vaults/IRocketStorage.sol";
import { RocketPoolVaultStorage } from "./RocketPoolVaultStorage.sol";

import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract RocketPoolDelegate is IRocketDelegate, ReentrancyGuard {
    IRocketStorage rocketStorage;
    RocketPoolVaultStorage rocketPoolVaultStorage; // holds the current vault implementation

    modifier onlyCurrentImplementation() {
        address currentVaultImplementation = rocketPoolVaultStorage.owner();
        require(msg.sender == currentVaultImplementation, "Only the current implementation can call function");
        _;
    }

    constructor(address _rocketStorageAddress, address _rocketPoolVaultStorageAddress) {
        rocketStorage = IRocketStorage(_rocketStorageAddress);
        rocketPoolVaultStorage = RocketPoolVaultStorage(_rocketPoolVaultStorageAddress);
    }

    function deposit() external payable override onlyCurrentImplementation nonReentrant returns (uint256) {
        // Load contracts
        address depositPoolAddress = rocketStorage.getAddress(
            keccak256(abi.encodePacked("contract.address", "rocketDepositPool"))
        );
        IRocketDepositPool depositPool = IRocketDepositPool(depositPoolAddress);
        address rethAddress = rocketStorage.getAddress(
            keccak256(abi.encodePacked("contract.address", "rocketTokenRETH"))
        );
        IRocketTokenRETH rETH = IRocketTokenRETH(rethAddress);

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
        IRocketTokenRETH rETH = IRocketTokenRETH(rethAddress);

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
        IRocketTokenRETH rETH = IRocketTokenRETH(rethAddress);

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
        IRocketTokenRETH rETH = IRocketTokenRETH(rethAddress);

        rETH.transfer(recipient, lpTokenAmount);
    }

    receive() external payable {}
}
