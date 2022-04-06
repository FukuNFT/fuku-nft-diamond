// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IRewardsClaim } from "../interfaces/facets/IRewardsClaim.sol";
import { LibCompetitiveBidUtils } from "../libraries/LibCompetitiveBidUtils.sol";

contract RewardsClaimFacet is IRewardsClaim {
    /**
     * @notice Claims available rewards for caller
     */
    function claimRewards(uint256 epoch) external override {
        // calculate
        uint256 userRewards;
        uint256 userBidRewards = LibCompetitiveBidUtils.calculateUserBidRewards(epoch, msg.sender);
        // todo: other rewards
        userRewards += userBidRewards;

        emit RewardsClaim(msg.sender, epoch, userRewards);
    }
}
