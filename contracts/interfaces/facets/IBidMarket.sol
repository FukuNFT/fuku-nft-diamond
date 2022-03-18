// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { BidInputParams } from "../../FukuTypes.sol";

interface IBidMarket {
    event BidEntered(
        uint256 bidId,
        uint256 amount,
        bytes12 vaultName,
        address indexed nft,
        uint256 indexed nftIndex,
        address indexed bidder
    );

    event BidAccepted(uint256 bidId, address indexed bidder, address indexed seller, uint256 bidAmount);

    event BidWithdrawn(uint256 bidId, address indexed bidder);

    event BidModified(uint256 bidId, uint256 amount);

    function placeBid(BidInputParams calldata bidInputParams) external;

    function placeMultipleBids(BidInputParams[] calldata bidInputParams) external;

    function modifyBid(uint256 bidId, uint256 amount) external;

    function modifyMultipleBids(uint256[] memory bidIds, uint256[] memory amounts) external;

    function withdrawBid(uint256 bidId) external;

    function withdrawMultipleBids(uint256[] memory bidIds) external;

    function acceptBid(uint256 bidId) external;
}
