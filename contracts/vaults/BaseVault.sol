// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IVault } from "../interfaces/IVault.sol";

import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import { ERC4626 } from "@rari-capital/solmate/src/mixins/ERC4626.sol";
import { ERC20 } from "@rari-capital/solmate/src/tokens/ERC20.sol";

abstract contract BaseVault is IVault, ERC4626, ReentrancyGuard {
    address private diamond;

    constructor(
        address _diamond,
        address _asset,
        string memory _name,
        string memory _symbol
    ) ERC4626(ERC20(_asset), _name, _symbol) {
        diamond = _diamond;
    }

    modifier onlyDiamond() {
        require(msg.sender == diamond, "Only diamond can call function");
        _;
    }

    receive() external payable {}
}
