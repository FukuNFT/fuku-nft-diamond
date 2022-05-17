// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.0;

interface IRocketDepositPool {
    function deposit() external payable;

    function getUserLastDepositBlock(address _address) external view returns (uint256);
}
