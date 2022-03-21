// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { BaseVault } from "./BaseVault.sol";

contract EmptyVault is BaseVault {
    constructor(address _diamond) BaseVault(_diamond) {}

    function deposit() external payable override onlyDiamond nonReentrant returns (uint256) {
        // nothing to do

        return msg.value;
    }

    function depositLpToken(uint256) external override onlyDiamond nonReentrant {
        revert("Disabled.");
    }

    function transferFunds(address payable newVaultAddress) external override onlyDiamond {
        newVaultAddress.transfer(address(this).balance);
    }

    function withdraw(uint256 lpTokenAmount, address payable recipient)
        external
        override
        onlyDiamond
        nonReentrant
        returns (uint256)
    {
        recipient.transfer(lpTokenAmount);

        return lpTokenAmount;
    }

    function withdrawLpToken(uint256, address) external override onlyDiamond nonReentrant {
        revert("Disabled.");
    }

    function getAmountETH(uint256 lpTokenAmount) external pure override returns (uint256) {
        return lpTokenAmount;
    }

    function getAmountLpTokens(uint256 ethAmount) external pure override returns (uint256) {
        return ethAmount;
    }
}
