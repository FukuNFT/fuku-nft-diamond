// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IAirdropClaim } from "../interfaces/facets/IAirdropClaim.sol";
import { LibStorage, AirdropClaimStorage, TokenAddressStorage } from "../libraries/LibStorage.sol";
import { LibDiamond } from "../vendor/libraries/LibDiamond.sol";

import { MerkleProof } from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AirdropClaimFacet is IAirdropClaim {
    /**
     * @notice Function to claim available airdrop
     *
     * @param amount The user airdrop amount
     * @param merkleProof The user merkle proof
     */
    function claimAirdrop(uint256 amount, bytes32[] calldata merkleProof) external override {
        AirdropClaimStorage storage acs = LibStorage.airdropClaimStorage();
        TokenAddressStorage storage tas = LibStorage.tokenAddressStorage();

        // verify the proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
        require(MerkleProof.verify(merkleProof, acs.merkleRoot, leaf), "Invalid merkle proof");
        require(acs.claimed[msg.sender] < amount, "Already claimed");

        // todo: determine how many tokens of airdrop to distribute
        // for now distribute entire claim
        // update the user's claim
        acs.claimed[msg.sender] += amount;

        IERC20(tas.fukuToken).transfer(msg.sender, amount);

        emit AirdropClaim(msg.sender, amount);
    }
}
