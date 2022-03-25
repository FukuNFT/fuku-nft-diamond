// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { BaseVault } from "./BaseVault.sol";

import { WETH } from "@rari-capital/solmate/src/tokens/WETH.sol";

contract EmptyVault is BaseVault {
    constructor(
        address _diamond,
        address _asset,
        string memory _name,
        string memory _symbol
    ) BaseVault(_diamond, _asset, _name, _symbol) {}

    function depositEth(address recipient) external payable override onlyDiamond nonReentrant returns (uint256) {
        // nothing to do

        return msg.value;
    }

    function transferFunds(address payable newVaultAddress) external override onlyDiamond {
        newVaultAddress.transfer(address(this).balance);
    }

    function withdrawEth(
        uint256 amount,
        address recipient,
        address owner
    ) external override onlyDiamond nonReentrant returns (uint256) {
        payable(recipient).transfer(amount);

        return amount;
    }

    function convertSharesToEth(uint256 lpTokenAmount) external pure override returns (uint256) {
        return lpTokenAmount;
    }

    function convertEthToShares(uint256 ethAmount) external pure override returns (uint256) {
        return ethAmount;
    }

    function totalAssets() public view override returns (uint256) {
        return asset.balanceOf(address(this));
    }
}
