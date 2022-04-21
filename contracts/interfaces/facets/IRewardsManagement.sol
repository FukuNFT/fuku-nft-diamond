// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IRewardsManagement {
    event EpochStarted(uint256 epochId, uint256 timestamp);

    event EpochDurationSet(uint256 duration);

    event EpochRewardsDistributionSet(uint256 epoch, uint256 totalRewards);

    function startEpoch() external;

    function setEpochDuration(uint256 duration) external;

    function setEpochRewardsDistribution(
        uint256 epoch,
        bytes32 merkleRoot,
        uint256 totalRewards
    ) external;
}
