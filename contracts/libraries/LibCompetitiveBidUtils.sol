// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { LibStorage, BidRewardsStorage, RewardsManagementStorage } from "./LibStorage.sol";

library LibCompetitiveBidUtils {
    function checkForCompetitiveBidIncrement(
        address user,
        address collection,
        uint256 bidAmount
    ) internal {
        BidRewardsStorage storage brs = LibStorage.bidRewardsStorage();
        RewardsManagementStorage storage rms = LibStorage.rewardsManagementStorage();

        // get the current epoch
        uint256 currentEpoch = rms.nextEpochId == 0 ? 0 : rms.nextEpochId - 1;

        // check if collection was selected for rewards (floor price of collection set)
        // and if bid amount qualifies as competitive bid
        // todo: finalize competitive bid definition
        uint256 floorPrice = rms.floorPrices[currentEpoch][collection];
        if (floorPrice > 0 && isCompetitiveBid(floorPrice, bidAmount)) {
            brs.competitiveBids[currentEpoch][collection][user]++;
            brs.totalCollectionBids[currentEpoch][collection]++;
        }
    }

    function checkForCompetitiveBidDecrement(
        address user,
        address collection,
        uint256 bidAmount
    ) internal {
        BidRewardsStorage storage brs = LibStorage.bidRewardsStorage();
        RewardsManagementStorage storage rms = LibStorage.rewardsManagementStorage();

        // get the current epoch
        uint256 currentEpoch = rms.nextEpochId == 0 ? 0 : rms.nextEpochId - 1;

        // check if collection was selected for rewards (floor price of collection set)
        // and if bid amount qualifies as competitive bid
        // todo: finalize competitive bid definition
        uint256 floorPrice = rms.floorPrices[currentEpoch][collection];
        if (floorPrice > 0 && isCompetitiveBid(floorPrice, bidAmount)) {
            // really this should never be the case where the bid amount is greater than 0, but safety check anyway
            if (brs.competitiveBids[currentEpoch][collection][user] > 0) {
                brs.competitiveBids[currentEpoch][collection][user]--;
                brs.totalCollectionBids[currentEpoch][collection]--;
            }
        }
    }

    function isCompetitiveBid(uint256 floorPrice, uint256 bidAmount) internal pure returns (bool) {
        return bidAmount > floorPrice;
    }

    function calculateUserBidRewards(uint256 epoch, address user) internal view returns (uint256) {
        BidRewardsStorage storage brs = LibStorage.bidRewardsStorage();
        RewardsManagementStorage storage rms = LibStorage.rewardsManagementStorage();

        uint256 userBidRewards;
        for (uint256 i = 0; i < rms.rewardedCollections.length; ++i) {
            address collection = rms.rewardedCollections[i];
            uint256 collectionAllocation = rms.collectionAllocation[epoch][collection];
            uint256 totalCollectionBids = brs.totalCollectionBids[epoch][collection];
            uint256 userBids = brs.competitiveBids[epoch][collection][user];

            // calculate user share of rewards
            if (userBids > 0 && totalCollectionBids > 0) {
                userBidRewards += (userBids * collectionAllocation) / totalCollectionBids;
            }
        }

        return userBidRewards;
    }
}
