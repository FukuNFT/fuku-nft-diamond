// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IRewardsManagement } from "../interfaces/facets/IRewardsManagement.sol";
import { LibStorage, RewardsManagementStorage, TokenAddressStorage } from "../libraries/LibStorage.sol";
import { LibDiamond } from "../vendor/libraries/LibDiamond.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RewardsManagementFacet is IRewardsManagement {
    /**
     * @notice Enforces only diamond owner can call function
     */
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }

    /**
     * @notice Admin function to start the epoch
     */
    function startEpoch() external override onlyOwner {
        RewardsManagementStorage storage rms = LibStorage.rewardsManagementStorage();

        // verify the epoch duration has been set
        require(rms.epochDuration > 0, "Epoch duration not set");
        // verify current epoch has ended
        uint256 currentEpoch = rms.nextEpochId == 0 ? 0 : rms.nextEpochId - 1;
        require(block.timestamp > rms.epochEndings[currentEpoch], "Epoch has not ended");

        currentEpoch = rms.nextEpochId++;
        uint256 epochEnd = block.timestamp + rms.epochDuration;
        rms.epochEndings[currentEpoch] = epochEnd;

        emit EpochStarted(currentEpoch, epochEnd);
    }

    /**
     * @notice Admin function to set the epoch duration
     *
     * @param duration The epoch duration
     */
    function setEpochDuration(uint256 duration) external override onlyOwner {
        RewardsManagementStorage storage rms = LibStorage.rewardsManagementStorage();

        rms.epochDuration = duration;

        emit EpochDurationSet(duration);
    }

    /**
     * @notice Admin function to set the epoch rewards distribution
     *
     * @param epoch The epoch
     * @param merkleRoot The merkle root for the claim
     * @param totalRewards The total amount of rewards set for this epoch
     */
    function setEpochRewardsDistribution(
        uint256 epoch,
        bytes32 merkleRoot,
        uint256 totalRewards
    ) external override onlyOwner {
        RewardsManagementStorage storage rms = LibStorage.rewardsManagementStorage();
        TokenAddressStorage storage tas = LibStorage.tokenAddressStorage();

        // verify epoch has ended
        require(rms.epochEndings[epoch] > 0 && block.timestamp > rms.epochEndings[epoch], "Epoch has not ended");
        // verify rewards have not already been set
        require(
            rms.epochRewardsMekleRoots[epoch] == bytes32(0) && rms.epochTotalRewards[epoch] == 0,
            "Epoch rewards already set"
        );

        // set the rewards values
        rms.epochRewardsMekleRoots[epoch] = merkleRoot;
        rms.epochTotalRewards[epoch] = totalRewards;

        // transfer in reward tokens
        IERC20(tas.fukuToken).transferFrom(msg.sender, address(this), totalRewards);

        emit EpochRewardsDistributionSet(epoch, totalRewards);
    }
}
