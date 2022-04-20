// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IRewardsManagement {
    event EpochStarted(uint256 epochId, uint256 timestamp);

    event EpochDurationSet(uint256 duration);

    function startEpoch() external;

    function setEpochDuration(uint256 duration) external;
}
