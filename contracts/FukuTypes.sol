// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

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
