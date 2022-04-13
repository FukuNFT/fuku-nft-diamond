// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IRewardsManagement {
    event EpochStarted(uint256 epochId, uint256 timestamp);

    event EpochDurationSet(uint256 duration);

    event CollectionAllocated(uint256 epochId, address nftCollection, uint256 allocationAmount);

    event DepositsAllocated(uint256 epochId, uint256 allocationAmount);

    event SalesAllocated(uint256 epochId, uint256 allocationAmount);

    event SalesShareSet(uint256 sellerShareBp);

    function startEpoch() external;

    function setEpochDuration(uint256 duration) external;

    function setCollectionAllocation(
        address nftCollection,
        uint256 allocationAmount,
        uint256 floorPrice
    ) external;

    function setDepositsAllocation(uint256 allocationAmount) external;

    function setSalesAllocation(uint256 allocationAmount) external;

    function setSalesSplit(uint256 sellerShareBp) external;
}
