// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { LibStorage, BidRewardsStorage, RewardsManagementStorage, SalesRewardsStorage } from "./LibStorage.sol";

library LibRewardsUtils {
    function getCurrentEpoch() internal view returns (uint256 currentEpoch) {
        RewardsManagementStorage storage rms = LibStorage.rewardsManagementStorage();

        // get the current epoch
        currentEpoch = rms.nextEpochId == 0 ? 0 : rms.nextEpochId - 1;
    }

    function checkForCompetitiveBidIncrement(
        address user,
        address collection,
        uint256 bidAmount
    ) internal {
        BidRewardsStorage storage brs = LibStorage.bidRewardsStorage();
        RewardsManagementStorage storage rms = LibStorage.rewardsManagementStorage();

        // get the current epoch
        uint256 currentEpoch = getCurrentEpoch();

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
        uint256 currentEpoch = getCurrentEpoch();

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

    function checkForSaleReward(address user, address collection) internal {
        SalesRewardsStorage storage srs = LibStorage.salesRewardsStorage();
        RewardsManagementStorage storage rms = LibStorage.rewardsManagementStorage();

        // get the current epoch
        uint256 currentEpoch = getCurrentEpoch();

        // check if collection was selected for rewards (floor price of collection set)
        uint256 floorPrice = rms.floorPrices[currentEpoch][collection];
        if (floorPrice > 0) {
            srs.sales[currentEpoch][user]++;
            srs.totalSales[currentEpoch]++;
        }
    }

    function isCompetitiveBid(uint256 floorPrice, uint256 bidAmount) internal pure returns (bool) {
        return bidAmount > floorPrice;
    }

    function calculateUserBidRewards(uint256 epoch, address user) internal view returns (uint256) {
        BidRewardsStorage storage brs = LibStorage.bidRewardsStorage();
        RewardsManagementStorage storage rms = LibStorage.rewardsManagementStorage();

        uint256 userBidRewards;
        for (uint256 i = 0; i < rms.rewardedCollections[epoch].length; ++i) {
            address collection = rms.rewardedCollections[epoch][i];
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

    function calculateUserSalesRewards(uint256 epoch, address user) internal view returns (uint256) {
        SalesRewardsStorage storage srs = LibStorage.salesRewardsStorage();
        RewardsManagementStorage storage rms = LibStorage.rewardsManagementStorage();

        uint256 userSalesRewards;
        uint256 salesAllocation = rms.salesAllocation[epoch];
        uint256 totalSales = srs.totalSales[epoch];
        uint256 userSales = srs.sales[epoch][user];
        if (userSales > 0) {
            userSalesRewards = (userSales * salesAllocation) / totalSales;
        }

        return userSalesRewards;
    }
}
