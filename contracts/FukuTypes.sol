// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

enum OptionDuration {
    ThirtyDays,
    NinetyDays
}

struct BidInputParams {
    bytes12 vault; // the vault from where the funds for the bid originate
    address nft; // the address of the nft collection
    uint256 nftIndex; // the index of the nft in the collection
    uint256 amount; // the bid amount
}

struct BidInfo {
    BidInputParams bidInputParams; // the input params used to create bid
    address bidder; // the address of the bidder
}

struct OptionInputParams {
    BidInputParams bidInputParams;
    uint256 premium;
    OptionDuration duration;
}

struct OptionInfo {
    BidInputParams bidInputParams; // the input params used to create base part of bid
    bool exercisable; // true if option can be exercised, false otherwise
    address bidder; // the bidder (buyer)
    address seller; // the nft owner (seller)
    uint256 premium; // the option premium
    uint256 optionExpiry; // the option expiry
}
