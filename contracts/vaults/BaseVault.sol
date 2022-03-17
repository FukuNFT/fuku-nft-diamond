// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IVault } from "../interfaces/IVault.sol";

import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

abstract contract BaseVault is IVault, ReentrancyGuard {
    address private diamond;

    constructor(address _diamond) {
        diamond = _diamond;
    }

    modifier onlyDiamond() {
        require(msg.sender == diamond, "Only diamond can call function");
        _;
    }
}
