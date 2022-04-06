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
        uint256 floorPrice = brs.floorPrices[currentEpoch][collection];
        if (floorPrice > 0 && isCompetitiveBid(floorPrice, bidAmount)) {
            brs.competitiveBids[currentEpoch][user]++;
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
        uint256 floorPrice = brs.floorPrices[currentEpoch][collection];
        if (floorPrice > 0 && isCompetitiveBid(floorPrice, bidAmount)) {
            // really this should never be the case where the bid amount is greater than 0, but safety check anyway
            if (brs.competitiveBids[currentEpoch][user] > 0) {
                brs.competitiveBids[currentEpoch][user]--;
            }
        }
    }

    function isCompetitiveBid(uint256 floorPrice, uint256 bidAmount) internal pure returns (bool) {
        return bidAmount > floorPrice;
    }
}
