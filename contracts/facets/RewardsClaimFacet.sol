// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IRewardsClaim } from "../interfaces/facets/IRewardsClaim.sol";
import { LibStorage, TokenAddressStorage, RewardsManagementStorage } from "../libraries/LibStorage.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RewardsClaimFacet is IRewardsClaim {
    /**
     * @notice Claims available rewards for caller
     */
    function claimRewards(uint256 epoch) external override {
        TokenAddressStorage storage tas = LibStorage.tokenAddressStorage();
        RewardsManagementStorage storage rms = LibStorage.rewardsManagementStorage();

        // ensure user claims reward to an epoch that has ended
        require(rms.epochEndings[epoch] > 0, "Epoch not started");
        require(block.timestamp > rms.epochEndings[epoch], "Epoch not ended");

        // todo: calculate
        uint256 userRewards;
        require(userRewards > 0, "User has no rewards");

        // transfer the rewards tokens
        IERC20(tas.fukuToken).transfer(msg.sender, userRewards);

        emit RewardsClaim(msg.sender, epoch, userRewards);
    }
}
