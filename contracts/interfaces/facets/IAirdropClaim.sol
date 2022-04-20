// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IAirdropClaim {
    event AirdropClaim(address user, uint256 amount);

    function claimAirdrop(uint256 amount, bytes32[] calldata merkleProof) external;
}
