// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { OptionDuration, OptionInputParams } from "../../FukuTypes.sol";

interface IOptionMarket {
    event OptionBidEntered(
        uint256 optionId,
        uint256 strike,
        uint256 premium,
        OptionDuration duration,
        bytes12 vaultName,
        address indexed collection,
        uint256 indexed nftIndex,
        address indexed bidder
    );

    event OptionBidWithdrawn(uint256 optionId, address indexed bidder);

    event OptionBidModified(uint256 optionId, uint256 strike, uint256 premium, OptionDuration duration);

    event OptionBidAccepted(
        uint256 optionId,
        address indexed bidder,
        address indexed nftOwner,
        uint256 strike,
        uint256 optionEnd
    );

    event OptionExercised(uint256 optionId, address indexed bidder, uint256 strike);

    event OptionExpired(uint256 optionId);

    function placeOptionBid(OptionInputParams calldata optionParams) external;

    function modifyOptionBid(
        uint256 optionId,
        uint256 strike,
        uint256 premium,
        OptionDuration duration
    ) external;

    function withdrawOptionBid(uint256 optionId) external;

    function acceptOptionBid(uint256 optionId) external;

    function exerciseOption(uint256 optionId) external;

    function closeOption(uint256 optionId) external;
}
