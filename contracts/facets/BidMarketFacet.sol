// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IBidMarket } from "../interfaces/facets/IBidMarket.sol";
import { ICryptoPunksMarket } from "../interfaces/ICryptoPunksMarket.sol";
import { IVault } from "../interfaces/IVault.sol";
import { LibStorage, BidMarketStorage, VaultStorage, TokenAddressStorage } from "../libraries/LibStorage.sol";
import { LibVaultUtils } from "../libraries/LibVaultUtils.sol";
import { LibCompetitiveBidUtils } from "../libraries/LibCompetitiveBidUtils.sol";
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
        TokenAddressStorage storage tas = LibStorage.tokenAddressStorage();

        require(bidInputParams.amount > 0, "Insufficient bid amount");

        if (bidInputParams.nft == tas.punkToken) {
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

        // check if competitive bid or not
        LibCompetitiveBidUtils.checkForCompetitiveBidIncrement(msg.sender, bidInputParams.nft, bidInputParams.amount);

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
        uint256 userEthVaultBalance = LibVaultUtils.getUserEthBalance(msg.sender, bms.bids[bidId].bidInput.vault);
        require(newAmount <= userEthVaultBalance, "Insufficient funds");

        bms.bids[bidId].bidInput.amount = newAmount;

        // todo: check for competitive bid definition

        emit BidModified(bidId, newAmount);
    }

    /**
     * @notice Modify multiple existing bids within one transaction
     *
     * @param bidIds Array of bid Ids
     * @param amounts Array of amounts
     */
    function modifyMultipleBids(uint256[] calldata bidIds, uint256[] calldata amounts) external override {
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

        // check if the withdrawn bid was competitive
        LibCompetitiveBidUtils.checkForCompetitiveBidDecrement(
            msg.sender,
            bms.bids[bidId].bidInput.nft,
            bms.bids[bidId].bidInput.amount
        );

        // set bid values back to default
        delete bms.bids[bidId];

        emit BidWithdrawn(bidId, msg.sender);
    }

    /**
     * @notice Cancels multiple bids in one transaction
     *
     * @param bidIds Array of bid Ids
     */
    function withdrawMultipleBids(uint256[] calldata bidIds) external override {
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
        TokenAddressStorage storage tas = LibStorage.tokenAddressStorage();

        BidInfo memory bidInfo = bms.bids[bidId];
        IVault vault = IVault(vs.vaultAddresses[bidInfo.bidInput.vault]);

        // verify bid exists
        require(bidInfo.bidder != address(0), "Bid does not exist");

        // verify bidder still has enough in vault for bid to go through
        uint256 bidLPTokenAmount = vault.getAmountLpTokens(bidInfo.bidInput.amount);
        uint256 userLPTokenBalance = LibVaultUtils.getUserLpTokenBalance(bidInfo.bidder, bidInfo.bidInput.vault);
        uint256 userEthVaultBalance = LibVaultUtils.getUserEthBalance(bidInfo.bidder, bidInfo.bidInput.vault);
        // check both LP and ETH in case of slight conversion rounding errors
        require(
            bidLPTokenAmount <= userLPTokenBalance && bidInfo.bidInput.amount <= userEthVaultBalance,
            "Bid no longer valid"
        );

        // update user balance
        vs.userVaultBalances[bidInfo.bidder][bidInfo.bidInput.vault] -= bidLPTokenAmount;
        // withdraw funds from vault
        uint256 ethReturned = vault.withdraw(bidLPTokenAmount, payable(this));
        // another safety check to make sure enough ETH was withdrawn
        require(bidInfo.bidInput.amount <= ethReturned, "Didn't burn enough LP tokens");

        // check if punk bid
        if (bidInfo.bidInput.nft == tas.punkToken) {
            require(
                ICryptoPunksMarket(tas.punkToken).punkIndexToAddress(bidInfo.bidInput.nftIndex) == msg.sender,
                "Not your punk"
            );

            ICryptoPunksMarket(tas.punkToken).buyPunk{ value: bidInfo.bidInput.amount }(bidInfo.bidInput.nftIndex);
            ICryptoPunksMarket(tas.punkToken).transferPunk(bidInfo.bidder, bidInfo.bidInput.nftIndex);
        } else {
            require(IERC721(bidInfo.bidInput.nft).ownerOf(bidInfo.bidInput.nftIndex) == msg.sender, "Not your NFT");

            payable(msg.sender).transfer(bidInfo.bidInput.amount);

            IERC721(bidInfo.bidInput.nft).safeTransferFrom(msg.sender, bidInfo.bidder, bidInfo.bidInput.nftIndex);
        }

        delete bms.bids[bidId];
        emit BidAccepted(bidId, bidInfo.bidder, msg.sender, bidInfo.bidInput.amount);
    }

    receive() external payable {}
}
