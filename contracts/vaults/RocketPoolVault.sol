// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { BaseVault } from "./BaseVault.sol";
import { RocketDepositPoolInterface } from "../interfaces/vaults/RocketDepositPoolInterface.sol";
import { RocketTokenRETHInterface } from "../interfaces/vaults/RocketTokenRETHInterface.sol";
import { RocketStorageInterface } from "../interfaces/vaults/RocketStorageInterface.sol";
import { RocketVaultInterface } from "../interfaces/vaults/RocketVaultInterface.sol";
import { IRocketPoolVaultStorage } from "../interfaces/vaults/IRocketPoolVaultStorage.sol";
import { RocketPoolDelegate } from "./RocketPoolDelegate.sol";

contract RocketVault is BaseVault {
    // stores state for Rocket Protocol
    RocketStorageInterface rocketStorage;

    // storage for Rocket Vault
    IRocketPoolVaultStorage rocketPoolVaultStorage;

    constructor(
        address _diamond,
        address _rocketStorageAddress,
        address _rocketPoolVaultStorageAddress
    ) BaseVault(_diamond) {
        rocketStorage = RocketStorageInterface(_rocketStorageAddress);
        rocketPoolVaultStorage = IRocketPoolVaultStorage(_rocketPoolVaultStorageAddress);
    }

    function deposit(bytes32 _data) external payable override onlyDiamond nonReentrant returns (uint256) {
        // retrive delegate address
        address delegateAddress = rocketPoolVaultStorage.getDelegateAddress(_data);

        // if delegate doesn't exist, create new
        // if delegate exists, use
        if (delegateAddress == address(0)) {
            RocketPoolDelegate newDelegate = new RocketPoolDelegate(
                address(rocketStorage),
                address(rocketPoolVaultStorage)
            );
            // stores new user's delegate address
            rocketPoolVaultStorage.setDelegateAddress(_data, address(newDelegate));
            return newDelegate.deposit{ value: msg.value }();
        } else {
            RocketPoolDelegate existingDelegate = RocketPoolDelegate(delegateAddress);
            return existingDelegate.deposit{ value: msg.value }();
        }
    }

    function depositLpToken(
        bytes32 _data,
        uint256 amount,
        address user
    ) external override onlyDiamond nonReentrant {
        // Load rETH contract
        address rethAddress = rocketStorage.getAddress(
            keccak256(abi.encodePacked("contract.address", "rocketTokenRETH"))
        );
        RocketTokenRETHInterface rETH = RocketTokenRETHInterface(rethAddress);

        // retrive delegate address
        address delegateAddress = rocketPoolVaultStorage.getDelegateAddress(_data);

        // if doesn't exist, create new delegate
        // if delegate exists, use
        if (delegateAddress == address(0)) {
            RocketPoolDelegate newDelegate = new RocketPoolDelegate(
                address(rocketStorage),
                address(rocketPoolVaultStorage)
            );
            // stores new user's delegate address
            rocketPoolVaultStorage.setDelegateAddress(_data, address(newDelegate));
            rETH.transferFrom(user, address(newDelegate), amount);
        } else {
            RocketPoolDelegate existingDelegate = RocketPoolDelegate(delegateAddress);
            rETH.transferFrom(user, address(existingDelegate), amount);
        }
    }

    function withdraw(
        bytes32 _data,
        uint256 lpTokenAmount,
        address payable recipient
    ) external override onlyDiamond nonReentrant returns (uint256) {
        // retrive delegate address
        address delegateAddress = rocketPoolVaultStorage.getDelegateAddress(_data);
        RocketPoolDelegate delegate = RocketPoolDelegate(delegateAddress);

        return delegate.withdraw(lpTokenAmount, payable(recipient));
    }

    function withdrawLpToken(
        bytes32 _data,
        uint256 lpTokenAmount,
        address recipient
    ) external override onlyDiamond nonReentrant {
        // retrive delegate address
        address delegateAddress = rocketPoolVaultStorage.getDelegateAddress(_data);
        RocketPoolDelegate delegate = RocketPoolDelegate(delegateAddress);

        delegate.withdrawLpToken(lpTokenAmount, recipient);
    }

    function transferFunds(address payable newImplementation) external override onlyDiamond {
        // upgrade current implementation to new implementation?
        // if so, just need to update in RocketPoolVaultStorage
        rocketPoolVaultStorage.setNewImplementation(newImplementation);
    }

    function getAmountETH(uint256 lpTokenAmount) external view override returns (uint256) {
        // Load rocketVault and rETH contracts
        address rocketVaultAddress = rocketStorage.getAddress(
            keccak256(abi.encodePacked("contract.address", "rocketVault"))
        );
        RocketVaultInterface rocketVault = RocketVaultInterface(rocketVaultAddress);
        address rethAddress = rocketStorage.getAddress(
            keccak256(abi.encodePacked("contract.address", "rocketTokenRETH"))
        );
        RocketTokenRETHInterface rETH = RocketTokenRETHInterface(rethAddress);

        uint256 ethAmount = rETH.getEthValue(lpTokenAmount);

        // check if rocket vault has enough to withdraw, if not return rocket vault balance
        uint256 vaultBalance = rocketVault.balanceOf("rocketDepositPool");
        if (vaultBalance >= ethAmount) {
            return ethAmount;
        } else {
            return vaultBalance;
        }
    }

    function getAmountLpTokens(uint256 ethAmount) external view override returns (uint256) {
        // Load rETH contract
        address rethAddress = rocketStorage.getAddress(
            keccak256(abi.encodePacked("contract.address", "rocketTokenRETH"))
        );
        RocketTokenRETHInterface rETH = RocketTokenRETHInterface(rethAddress);

        return rETH.getRethValue(ethAmount);
    }

    function getLpToken() external view override returns (address) {
        return rocketStorage.getAddress(keccak256(abi.encodePacked("contract.address", "rocketTokenRETH")));
    }
}
