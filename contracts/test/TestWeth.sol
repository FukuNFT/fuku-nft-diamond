// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IWeth } from "../interfaces/IWeth.sol";

import { ERC20 } from "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract TestWeth is IWeth, ERC20 {
    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}

    function deposit() external payable override {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external override {
        _burn(msg.sender, amount);
        payable(msg.sender).transfer(amount);
    }
}
