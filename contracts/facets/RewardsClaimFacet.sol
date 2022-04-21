// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IRewardsClaim } from "../interfaces/facets/IRewardsClaim.sol";
import { LibStorage, TokenAddressStorage, RewardsManagementStorage } from "../libraries/LibStorage.sol";

import { MerkleProof } from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RewardsClaimFacet is IRewardsClaim {
    /**
     * @notice Claims available rewards for caller
     *
     * @param epoch The epoch to claim rewards for
     * @param amount The amount of reward tokens to claim for the user
     * @param merkleProof The merkle proof for the user's claim
     */
    function claimRewards(
        uint256 epoch,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external override {
        TokenAddressStorage storage tas = LibStorage.tokenAddressStorage();
        RewardsManagementStorage storage rms = LibStorage.rewardsManagementStorage();

        // ensure user claims reward to an epoch that has ended
        require(rms.epochEndings[epoch] > 0, "Epoch not started");
        require(block.timestamp > rms.epochEndings[epoch], "Epoch not ended");

        // ensure the rewards have been set
        require(
            rms.epochRewardsMekleRoots[epoch] != bytes32(0) && rms.epochTotalRewards[epoch] > 0,
            "Epoch rewards not set"
        );

        // ensure user has not already claimed
        require(!rms.rewardsClaimed[epoch][msg.sender], "Already claimed");

        // verify the proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
        require(MerkleProof.verify(merkleProof, rms.epochRewardsMekleRoots[epoch], leaf), "Invalid merkle proof");

        // set to claimed
        rms.rewardsClaimed[epoch][msg.sender] = true;

        // transfer the rewards tokens
        IERC20(tas.fukuToken).transfer(msg.sender, amount);

        emit RewardsClaim(msg.sender, epoch, amount);
    }
}
