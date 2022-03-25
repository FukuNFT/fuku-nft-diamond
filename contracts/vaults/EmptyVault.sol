// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { BaseVault } from "./BaseVault.sol";
import { IWeth } from "../interfaces/IWeth.sol";

contract EmptyVault is BaseVault {
    constructor(
        address _diamond,
        address _asset,
        string memory _name,
        string memory _symbol
    ) BaseVault(_diamond, _asset, _name, _symbol) {}

    function depositEth(address recipient) external payable override onlyDiamond nonReentrant returns (uint256) {
        require(msg.value <= maxDeposit(recipient), "ERC4626: deposit more then max");

        // calculate the amount of shares to mint
        uint256 shares = previewDeposit(msg.value);

        // convert ETH to WETH
        IWeth(asset()).deposit{ value: msg.value }();

        // mint vault tokens
        _mint(recipient, shares);

        return msg.value;
    }

    function transferFunds(address payable newVaultAddress) external override onlyDiamond {
        newVaultAddress.transfer(address(this).balance);
    }

    function redeemEth(
        uint256 shares,
        address recipient,
        address owner
    ) external override onlyDiamond nonReentrant returns (uint256) {
        require(shares <= maxRedeem(owner), "ERC4626: redeem more then max");

        // calculate the amount of assets to receive
        uint256 assets = previewRedeem(shares);

        // convert WETH to ETH
        IWeth(asset()).withdraw(assets);

        // burn the vault tokens
        _burn(owner, shares);

        // send ETH to recipient
        payable(recipient).transfer(assets);

        return assets;
    }

    function convertSharesToEth(uint256 lpTokenAmount) external pure override returns (uint256) {
        return lpTokenAmount;
    }

    function convertEthToShares(uint256 ethAmount) external pure override returns (uint256) {
        return ethAmount;
    }
}
