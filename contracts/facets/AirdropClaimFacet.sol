// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IAirdropClaim } from "../interfaces/facets/IAirdropClaim.sol";
import { LibStorage, AirdropClaimStorage } from "../libraries/LibStorage.sol";
import { LibDiamond } from "../vendor/libraries/LibDiamond.sol";

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract AirdropClaimFacet is IAirdropClaim {
    /**
     * @notice Enforces only diamond owner can call function
     */
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }

    /**
     * @notice Sets the merkle root for the airdrop
     * @dev Only callable by diamond owner
     *
     * @param merkleRoot The merkle root
     */
    function setMerkleRoot(bytes32 merkleRoot) external override onlyOwner {
        AirdropClaimStorage storage acs = LibStorage.airdropClaimStorage();

        acs.merkleRoot = merkleRoot;
    }

    /**
     * @notice Function to claim available airdrop
     */
    function claimAirdrop(uint256 amount, bytes32[] calldata merkleProof) external override {
        AirdropClaimStorage storage acs = LibStorage.airdropClaimStorage();

        // verify the proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
        require(MerkleProof.verify(merkleProof, acs.merkleRoot, leaf), "Address not whitelisted");

        // todo: determine how many tokens of airdrop to distribute

        // update the user's claim
        acs.claimed[msg.sender] += amount;

        emit AirdropClaim(msg.sender, amount);
    }
}
