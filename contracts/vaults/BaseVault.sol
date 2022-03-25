// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IVault } from "../interfaces/IVault.sol";

import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import { ERC20 } from "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import { ERC4626 } from "openzeppelin-solidity/contracts/token/ERC20/extensions/ERC4626.sol";
import { IERC20Metadata } from "openzeppelin-solidity/contracts/token/ERC20/extensions/IERC20Metadata.sol";

abstract contract BaseVault is IVault, ERC4626, ReentrancyGuard {
    address private diamond;

    constructor(
        address _diamond,
        address _asset,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) ERC4626(IERC20Metadata(_asset)) {
        diamond = _diamond;
    }

    modifier onlyDiamond() {
        require(msg.sender == diamond, "Only diamond can call function");
        _;
    }

    receive() external payable {}
}
