// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IRewardsManagement {
    event EpochStarted(uint256 epochId, uint256 timestamp);

    event CollectionAllocated(address nftCollection, uint256 allocationAmount);

    event DepositsAllocated(uint256 allocationAmount);

    event SalesAllocated(uint256 allocationAmount);

    function startEpoch() external;

    function setCollectionAllocation(address nftCollection, uint256 allocationAmount) external;

    function setDepositsAllocation(uint256 allocationAmount) external;

    function setSalesAllocation(uint256 allocationAmount) external;
}
