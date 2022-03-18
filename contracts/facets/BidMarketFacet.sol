// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IBidMarket } from "../interfaces/facets/IBidMarket.sol";
import { ICryptoPunksMarket } from "../interfaces/ICryptoPunksMarket.sol";
import { IVault } from "../interfaces/IVault.sol";
import { LibStorage, BidMarketStorage, VaultStorage, PunkTokenStorage } from "../libraries/LibStorage.sol";
import { LibVaultUtils } from "../libraries/LibVaultUtils.sol";
import { BidInputParams, BidInfo } from "../FukuTypes.sol";

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract BidMarketFacet is IBidMarket {
    /**
     * @notice Places a bid for the NFT
     *
     * @param bidInputParams The input parameters used to place bid
     */
    function placeBid(BidInputParams calldata bidInputParams) public override {
        BidMarketStorage storage bms = LibStorage.bidMarketStorage();
        PunkTokenStorage storage pts = LibStorage.punkTokenStorage();

        require(bidInputParams.amount > 0, "Insufficient bid amount");

        if (bidInputParams.nft == pts.punkToken) {
            // check punk exists
            require(bidInputParams.nftIndex < 10000, "Punk not found");
        } else {
            // check erc721 owner exists
            require(IERC721(bidInputParams.nft).ownerOf(bidInputParams.nftIndex) != address(0), "NFT unowned");
        }

        // verify user has enough in vault to make bid
        uint256 userEthVaultBalance = LibVaultUtils.getUserEthBalance(msg.sender, bidInputParams.vault);
        require(bidInputParams.amount <= userEthVaultBalance, "Insufficient funds");

        // create the bid
        uint256 bidId = bms.nextBidId++;
        bms.bids[bidId] = BidInfo(bidInputParams, msg.sender);

        emit BidEntered(
            bidId,
            bidInputParams.amount,
            bidInputParams.vault,
            bidInputParams.nft,
            bidInputParams.nftIndex,
            msg.sender
        );
    }

    /**
     * @notice Places multiple bids within one transaction
     *
     * @param bidInputParams Array of bid input parameters
     */
    function placeMultipleBids(BidInputParams[] calldata bidInputParams) external override {
        for (uint256 i; i < bidInputParams.length; ++i) {
            placeBid(bidInputParams[i]);
        }
    }

    /**
     * @notice Allows a user to modify one of their existing bids
     *
     * @param bidId The bid id
     * @param newAmount The new bid amount
     */
    function modifyBid(uint256 bidId, uint256 newAmount) public override {
        BidMarketStorage storage bms = LibStorage.bidMarketStorage();

        // only bidder can modify bid
        require(bms.bids[bidId].bidder == msg.sender, "Not bid owner");
        // bids with 0 amount are invalid
        require(newAmount > 0, "Insufficient bid amount");

        // verify bidder has enough in vault to make bid
        uint256 userEthVaultBalance = LibVaultUtils.getUserEthBalance(msg.sender, bms.bids[bidId].bidInputParams.vault);
        require(newAmount <= userEthVaultBalance, "Insufficient funds");

        bms.bids[bidId].bidInputParams.amount = newAmount;

        emit BidModified(bidId, newAmount);
    }

    /**
     * @notice Modify multiple existing bids within one transaction
     *
     * @param bidIds Array of bid Ids
     * @param amounts Array of amounts
     */
    function modifyMultipleBids(uint256[] memory bidIds, uint256[] memory amounts) external override {
        require(bidIds.length == amounts.length, "Array length mismatch");
        for (uint256 i; i < bidIds.length; ++i) {
            modifyBid(bidIds[i], amounts[i]);
        }
    }

    /**
     * @notice Cancels an open bid by passing in the bidId
     *
     * @param bidId The bid id
     */
    function withdrawBid(uint256 bidId) public override {
        BidMarketStorage storage bms = LibStorage.bidMarketStorage();

        // only bidder can withdraw his bid
        require(bms.bids[bidId].bidder == msg.sender, "Not your bid");

        // set bid values back to default
        delete bms.bids[bidId];

        emit BidWithdrawn(bidId, msg.sender);
    }

    /**
     * @notice Cancels multiple bids in one transaction
     *
     * @param bidIds Array of bid Ids
     */
    function withdrawMultipleBids(uint256[] memory bidIds) external override {
        for (uint256 i; i < bidIds.length; ++i) {
            withdrawBid(bidIds[i]);
        }
    }

    /**
     * @notice NFT owner accepts an open bid on his NFT after approving the bid
     *
     * @param bidId The bid id
     */
    function acceptBid(uint256 bidId) external override {
        BidMarketStorage storage bms = LibStorage.bidMarketStorage();
        VaultStorage storage vs = LibStorage.vaultStorage();
        PunkTokenStorage storage pts = LibStorage.punkTokenStorage();

        BidInfo memory bidInfo = bms.bids[bidId];
        IVault vault = IVault(vs.vaultAddresses[bidInfo.bidInputParams.vault]);

        // verify bid exists
        require(bidInfo.bidder != address(0), "Bid does not exist");

        // verify bidder still has enough in vault for bid to go through
        uint256 bidLPTokenAmount = vault.getAmountLpTokens(bidInfo.bidInputParams.amount);
        uint256 userLPTokenBalance = LibVaultUtils.getUserLpTokenBalance(bidInfo.bidder, bidInfo.bidInputParams.vault);
        uint256 userEthVaultBalance = LibVaultUtils.getUserEthBalance(bidInfo.bidder, bidInfo.bidInputParams.vault);
        // check both LP and ETH in case of slight conversion rounding errors
        require(
            bidLPTokenAmount <= userLPTokenBalance && bidInfo.bidInputParams.amount <= userEthVaultBalance,
            "Bid no longer valid"
        );

        // update user balance
        vs.userVaultBalances[msg.sender][bidInfo.bidInputParams.vault] -= bidLPTokenAmount;
        // withdraw funds from vault
        uint256 ethReturned = vault.withdraw(bidLPTokenAmount, payable(this));
        // another safety check to make sure enough ETH was withdrawn
        require(bidInfo.bidInputParams.amount <= ethReturned, "Didn't burn enough LP tokens");

        // check if punk bid
        if (bidInfo.bidInputParams.nft == pts.punkToken) {
            require(
                ICryptoPunksMarket(pts.punkToken).punkIndexToAddress(bidInfo.bidInputParams.nftIndex) == msg.sender,
                "Not your punk"
            );
        } else {
            require(
                IERC721(bidInfo.bidInputParams.nft).ownerOf(bidInfo.bidInputParams.nftIndex) == msg.sender,
                "Not your NFT"
            );

            payable(msg.sender).transfer(bidInfo.bidInputParams.amount);

            IERC721(bidInfo.bidInputParams.nft).safeTransferFrom(
                msg.sender,
                bidInfo.bidder,
                bidInfo.bidInputParams.nftIndex
            );

            delete bms.bids[bidId];
            emit BidAccepted(bidId, bidInfo.bidder, msg.sender, bidInfo.bidInputParams.amount);
        }
    }

    receive() external payable {}
}
