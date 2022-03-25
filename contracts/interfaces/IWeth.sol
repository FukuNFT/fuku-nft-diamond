// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IERC20Metadata } from "openzeppelin-solidity/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IWeth is IERC20Metadata {
    function deposit() external payable;

    function withdraw(uint256 amount) external;
}
