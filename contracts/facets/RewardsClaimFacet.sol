// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IRewardsClaim } from "../interfaces/facets/IRewardsClaim.sol";
import { LibStorage, RewardsClaimStorage } from "../libraries/LibStorage.sol";

contract RewardsClaimFacet is IRewardsClaim {
    /**
     * @notice Claims available rewards for caller
     */
    function claimRewards() external override {
        RewardsClaimStorage storage rcs = LibStorage.rewardsClaimStorage();

        // todo: require amount is greater than 0
        uint256 rewardsAmount = rcs.rewards[msg.sender];
        rcs.rewards[msg.sender] = 0;

        emit RewardsClaim(msg.sender, rewardsAmount);
    }
}
