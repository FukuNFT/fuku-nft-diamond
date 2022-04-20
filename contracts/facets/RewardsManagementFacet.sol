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
        // verify epoch has not already begun
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
}
