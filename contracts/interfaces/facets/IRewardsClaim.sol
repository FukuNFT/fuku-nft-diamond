// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IRewardsClaim {
    event RewardsClaim(address user, uint256 amount);

    function claimRewards() external;
}
