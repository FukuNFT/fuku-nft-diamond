// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { BaseVault } from "../vaults/BaseVault.sol";
import { IRocketDepositPool } from "../interfaces/vaults/IRocketDepositPool.sol";
import { IRocketTokenRETH } from "../interfaces/vaults/IRocketTokenRETH.sol";
import { IRocketStorage } from "../interfaces/vaults/IRocketStorage.sol";
import { IRocketVault } from "../interfaces/vaults/IRocketVault.sol";
import { RocketPoolVaultStorage } from "../vaults/RocketPoolVaultStorage.sol";
import { RocketPoolDelegate } from "../vaults/RocketPoolDelegate.sol";

contract TestRocketVault is BaseVault {
    // stores state for Rocket Protocol
    IRocketStorage private rocketStorage;

    // storage for Rocket Vault
    RocketPoolVaultStorage private rocketPoolVaultStorage;

    constructor(
        address _diamond,
        address _rocketStorageAddress,
        address _rocketVaultStorageAddress
    ) BaseVault(_diamond) {
        rocketStorage = IRocketStorage(_rocketStorageAddress);
        rocketPoolVaultStorage = RocketPoolVaultStorage(_rocketVaultStorageAddress);
    }

    function deposit(bytes memory _data) external payable override onlyDiamond nonReentrant returns (uint256) {
        // retrieve delegate address
        address userAddress = abi.decode(_data, (address));
        address delegateAddress = rocketPoolVaultStorage.getDelegateAddress(userAddress);

        // if delegate doesn't exist, create new
        // if delegate exists, use
        if (delegateAddress == address(0)) {
            RocketPoolDelegate newDelegate = new RocketPoolDelegate(
                address(rocketStorage),
                address(rocketPoolVaultStorage)
            );
            // stores new user's delegate address
            rocketPoolVaultStorage.setDelegateAddress(userAddress, address(newDelegate));
            return newDelegate.deposit{ value: msg.value }();
        } else {
            RocketPoolDelegate existingDelegate = RocketPoolDelegate(payable(delegateAddress));
            return existingDelegate.deposit{ value: msg.value }();
        }
    }

    function depositLpToken(
        uint256 amount,
        address user,
        bytes memory _data
    ) external override onlyDiamond nonReentrant {
        // Load rETH contract
        address rethAddress = rocketStorage.getAddress(
            keccak256(abi.encodePacked("contract.address", "rocketTokenRETH"))
        );
        IRocketTokenRETH rETH = IRocketTokenRETH(rethAddress);

        // retrieve delegate address
        address userAddress = abi.decode(_data, (address));
        address delegateAddress = rocketPoolVaultStorage.getDelegateAddress(user);

        // if doesn't exist, create new delegate
        // if delegate exists, use
        if (delegateAddress == address(0)) {
            RocketPoolDelegate newDelegate = new RocketPoolDelegate(
                address(rocketStorage),
                address(rocketPoolVaultStorage)
            );
            // stores new user's delegate address
            rocketPoolVaultStorage.setDelegateAddress(userAddress, address(newDelegate));
            rETH.transferFrom(user, address(newDelegate), amount);
        } else {
            RocketPoolDelegate existingDelegate = RocketPoolDelegate(payable(delegateAddress));
            rETH.transferFrom(user, address(existingDelegate), amount);
        }
    }

    function withdraw(
        uint256 lpTokenAmount,
        address payable recipient,
        bytes memory _data
    ) external override onlyDiamond nonReentrant returns (uint256) {
        // retrieve delegate address
        address userAddress = abi.decode(_data, (address));
        address delegateAddress = rocketPoolVaultStorage.getDelegateAddress(userAddress);
        RocketPoolDelegate delegate = RocketPoolDelegate(payable(delegateAddress));

        return delegate.withdraw(lpTokenAmount, payable(recipient));
    }

    function withdrawLpToken(
        uint256 lpTokenAmount,
        address recipient,
        bytes memory _data
    ) external override onlyDiamond nonReentrant {
        // retrieve delegate address
        address userAddress = abi.decode(_data, (address));
        address delegateAddress = rocketPoolVaultStorage.getDelegateAddress(userAddress);
        RocketPoolDelegate delegate = RocketPoolDelegate(payable(delegateAddress));

        delegate.withdrawLpToken(lpTokenAmount, recipient);
    }

    function transferFunds(address payable newImplementation) external override onlyDiamond {
        // upgrade current implementation to new implementation
        rocketPoolVaultStorage.transferOwnership(newImplementation);

        // todo: should have a rescue plan if the delegate contracts are no longer compatible
    }

    function getAmountETH(uint256 lpTokenAmount) external view override returns (uint256) {
        // Load rocketVault and rETH contracts
        address rocketVaultAddress = rocketStorage.getAddress(
            keccak256(abi.encodePacked("contract.address", "rocketVault"))
        );
        IRocketVault rocketVault = IRocketVault(rocketVaultAddress);
        address rethAddress = rocketStorage.getAddress(
            keccak256(abi.encodePacked("contract.address", "rocketTokenRETH"))
        );
        IRocketTokenRETH rETH = IRocketTokenRETH(rethAddress);

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
        IRocketTokenRETH rETH = IRocketTokenRETH(rethAddress);

        return rETH.getRethValue(ethAmount);
    }

    function getLpToken() external view override returns (address) {
        return rocketStorage.getAddress(keccak256(abi.encodePacked("contract.address", "rocketTokenRETH")));
    }

    function getVaultStorage() external view returns (address) {
        return address(rocketPoolVaultStorage);
    }
}
