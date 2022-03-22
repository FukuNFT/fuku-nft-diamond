// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IOptionMarket } from "../interfaces/facets/IOptionMarket.sol";
import { ICryptoPunksMarket } from "../interfaces/ICryptoPunksMarket.sol";
import { IVault } from "../interfaces/IVault.sol";
import { LibStorage, OptionMarketStorage, VaultStorage, PunkTokenStorage } from "../libraries/LibStorage.sol";
import { LibVaultUtils } from "../libraries/LibVaultUtils.sol";
import { OptionDuration, OptionInputParams, OptionInfo } from "../FukuTypes.sol";

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract OptionMarketFacet is IOptionMarket {
    /**
     * @notice Places an option bid for the NFT
     *
     * @param optionParams The option params
     */
    function placeOptionBid(OptionInputParams calldata optionParams) external override {
        OptionMarketStorage storage oms = LibStorage.optionMarketStorage();
        PunkTokenStorage storage pts = LibStorage.punkTokenStorage();

        // ensure strike and premium are not 0
        require(
            optionParams.bidInput.amount > 0 && optionParams.premium > 0,
            "Insufficient strike and premium amounts"
        );

        if (optionParams.bidInput.nft == pts.punkToken) {
            // check punk exists
            require(optionParams.bidInput.nftIndex < 10000, "Punk not found");

            // check is not already owned by fuku marketplace
            require(
                ICryptoPunksMarket(pts.punkToken).punkIndexToAddress(optionParams.bidInput.nftIndex) != address(this),
                "Already in option"
            );
        } else {
            // check erc721 owner exists and is not already owned by fuku marketplace
            address nftOwner = IERC721(optionParams.bidInput.nft).ownerOf(optionParams.bidInput.nftIndex);
            require(nftOwner != address(0), "NFT unowned");
            require(nftOwner != address(this), "Already in option");
        }

        // verify user has enough in vault to pay premium
        uint256 userEthVaultBalance = LibVaultUtils.getUserEthBalance(msg.sender, optionParams.bidInput.vault);
        require(optionParams.premium <= userEthVaultBalance, "Insufficient funds");

        // create the option id
        uint256 optionId = oms.nextOptionId++;
        oms.options[optionId] = OptionInfo(optionParams, false, msg.sender);

        emit OptionBidEntered(
            optionId,
            optionParams.bidInput.amount,
            optionParams.premium,
            optionParams.duration,
            optionParams.bidInput.vault,
            optionParams.bidInput.nft,
            optionParams.bidInput.nftIndex,
            msg.sender
        );
    }

    /**
     * @notice Allows a bidder to modify one of their existing bids
     *
     * @param optionId The option id
     * @param strike The strike amount
     * @param premium The premium amount
     * @param duration The option duration
     */
    function modifyOptionBid(
        uint256 optionId,
        uint256 strike,
        uint256 premium,
        OptionDuration duration
    ) external override {
        OptionMarketStorage storage oms = LibStorage.optionMarketStorage();

        // only bidder can modify bid
        require(oms.options[optionId].bidder == msg.sender, "Not your bid");

        // can't modify if it has already been accepted
        require(!oms.options[optionId].exercisable, "Option already accepted");

        // strike and premium cannot be 0
        require(strike > 0 && premium > 0, "Insufficient strike and premium amounts");

        // verify user has enough in vault to pay premium
        uint256 userEthVaultBalance = LibVaultUtils.getUserEthBalance(
            msg.sender,
            oms.options[optionId].optionInput.bidInput.vault
        );
        require(premium <= userEthVaultBalance, "Insufficient funds");

        // modify option
        oms.options[optionId].optionInput.bidInput.amount = strike;
        oms.options[optionId].optionInput.premium = premium;
        oms.options[optionId].optionInput.duration = duration;

        emit OptionBidModified(optionId, strike, premium, duration);
    }

    /**
     * @notice Cancels an open option bid
     *
     * @param optionId The option id of the bid to cancel
     */
    function withdrawOptionBid(uint256 optionId) external override {
        OptionMarketStorage storage oms = LibStorage.optionMarketStorage();

        // only bidder can cancel their option bid
        require(oms.options[optionId].bidder == msg.sender, "Not your bid");

        // can only cancel if it has not yet been accepted
        require(!oms.options[optionId].exercisable, "Option already accepted");

        // cancel bid
        delete oms.options[optionId];

        emit OptionBidWithdrawn(optionId, msg.sender);
    }

    /**
     * @notice Accepts and option bid
     */
    function acceptOptionBid(uint256 optionId) external override {
        OptionMarketStorage storage oms = LibStorage.optionMarketStorage();
        VaultStorage storage vs = LibStorage.vaultStorage();
        PunkTokenStorage storage pts = LibStorage.punkTokenStorage();

        OptionInfo memory option = oms.options[optionId];
        IVault vault = IVault(vs.vaultAddresses[option.optionInput.bidInput.vault]);

        // make sure option exists
        require(option.bidder != address(0), "Option does not exist");

        // make sure option was not already accepted
        require(!option.exercisable, "Option already accepted");

        // make sure bidder can still cover the premium
        uint256 premiumLPTokenAmount = vault.getAmountLpTokens(option.optionInput.premium);
        uint256 userLPTokenBalance = LibVaultUtils.getUserLpTokenBalance(
            option.bidder,
            option.optionInput.bidInput.vault
        );
        uint256 userEthVaultBalance = LibVaultUtils.getUserEthBalance(option.bidder, option.optionInput.bidInput.vault);
        // check both LP and ETH in case of slight conversion rounding errors
        require(
            premiumLPTokenAmount <= userLPTokenBalance && option.optionInput.premium <= userEthVaultBalance,
            "Option no longer valid"
        );

        // update user balance
        vs.userVaultBalances[option.bidder][option.optionInput.bidInput.vault] -= premiumLPTokenAmount;
        // withdraw the premium from bidder's vault
        uint256 ethReturned = vault.withdraw(premiumLPTokenAmount, payable(this));
        // another safety check to make sure enough ETH was withdrawn
        require(option.optionInput.premium <= ethReturned, "Didn't burn enough LP tokens");

        // check if punk option bid
        if (option.optionInput.bidInput.nft == pts.punkToken) {
            require(
                ICryptoPunksMarket(pts.punkToken).punkIndexToAddress(option.optionInput.bidInput.nftIndex) ==
                    msg.sender,
                "Not your punk"
            );

            // buy the punk for the premium (punk now held in escrow)
            ICryptoPunksMarket(pts.punkToken).buyPunk{ value: option.optionInput.premium }(
                option.optionInput.bidInput.nftIndex
            );
        } else {
            require(
                IERC721(option.optionInput.bidInput.nft).ownerOf(option.optionInput.bidInput.nftIndex) == msg.sender,
                "Not your NFT"
            );

            payable(msg.sender).transfer(option.optionInput.premium);
            IERC721(option.optionInput.bidInput.nft).safeTransferFrom(
                msg.sender,
                address(this),
                option.optionInput.bidInput.nftIndex
            );
        }

        // update option info
        option.exercisable = true;
        oms.options[optionId] = option;

        // calculate the expiry
        uint256 expiry = option.optionInput.duration == OptionDuration.ThirtyDays
            ? block.timestamp + 30 days
            : block.timestamp + 90 days;

        // update the accepted option info
        oms.acceptedOptions[optionId].expiry = expiry;
        oms.acceptedOptions[optionId].seller = msg.sender;

        emit OptionBidAccepted(optionId, option.bidder, msg.sender, option.optionInput.bidInput.amount, expiry);
    }

    /**
     * @notice Exercises the accepted option by the bidder
     *
     * @param optionId The option id
     */
    function exerciseOption(uint256 optionId) external override {
        OptionMarketStorage storage oms = LibStorage.optionMarketStorage();
        VaultStorage storage vs = LibStorage.vaultStorage();

        OptionInfo memory option = oms.options[optionId];
        IVault vault = IVault(vs.vaultAddresses[option.optionInput.bidInput.vault]);

        // check to see if option is exercisable
        require(option.exercisable, "Option is not exercisable");
        // check to make sure is owner of option
        require(option.bidder == msg.sender, "Not your option");
        // check to make sure option is not expired
        require(block.timestamp < oms.acceptedOptions[optionId].expiry);

        // verify bidder has enough funds to exercise the option
        uint256 strikeLPTokenAmount = vault.getAmountLpTokens(option.optionInput.bidInput.amount);
        uint256 userLPTokenBalance = LibVaultUtils.getUserLpTokenBalance(
            option.bidder,
            option.optionInput.bidInput.vault
        );
        uint256 userEthVaultBalance = LibVaultUtils.getUserEthBalance(option.bidder, option.optionInput.bidInput.vault);
        // check both LP and ETH in case of slight conversion rounding errors
        require(
            strikeLPTokenAmount <= userLPTokenBalance && option.optionInput.bidInput.amount <= userEthVaultBalance,
            "Bid no longer valid"
        );

        // update user balance
        vs.userVaultBalances[option.bidder][option.optionInput.bidInput.vault] -= strikeLPTokenAmount;
        // withdraw the strike amount from bidder's vault
        uint256 ethReturned = vault.withdraw(strikeLPTokenAmount, payable(oms.acceptedOptions[optionId].seller));
        // another safety check to make sure enough ETH was withdrawn
        require(option.optionInput.bidInput.amount <= ethReturned, "Didn't burn enough LP tokens");

        // transfer to NFT to bidder
        _transferNFT(
            option.optionInput.bidInput.nft,
            option.optionInput.bidInput.nftIndex,
            address(this),
            option.bidder
        );

        delete oms.options[optionId];
        delete oms.acceptedOptions[optionId];

        emit OptionExercised(
            optionId,
            option.bidder,
            option.optionInput.bidInput.amount,
            option.optionInput.bidInput.nft,
            option.optionInput.bidInput.nftIndex
        );
    }

    /**
     * @notice Allows the seller to retrieve NFT in case option expired
     *
     * @param optionId The option id
     */
    function closeOption(uint256 optionId) external override {
        OptionMarketStorage storage oms = LibStorage.optionMarketStorage();

        // check to make sure is option seller
        require(oms.acceptedOptions[optionId].seller == msg.sender, "Not your option");
        // check to make sure option has expired
        require(block.timestamp < oms.acceptedOptions[optionId].expiry, "Option not expired");

        // send nft back to seller
        _transferNFT(
            oms.options[optionId].optionInput.bidInput.nft,
            oms.options[optionId].optionInput.bidInput.nftIndex,
            address(this),
            msg.sender
        );

        delete oms.options[optionId];
        delete oms.acceptedOptions[optionId];

        emit OptionClosed(optionId);
    }

    function _transferNFT(
        address nft,
        uint256 nftIndex,
        address from,
        address to
    ) internal {
        PunkTokenStorage storage pts = LibStorage.punkTokenStorage();

        // check if sending punk
        if (nft == pts.punkToken) {
            ICryptoPunksMarket(pts.punkToken).transferPunk(to, nftIndex);
        } else {
            IERC721(nft).safeTransferFrom(from, to, nftIndex);
        }
    }

    receive() external payable {}
}
