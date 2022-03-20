const { ethers } = require("hardhat");
const { expect } = require("chai");

const { fixture } = require("./fixture");

describe("Bid Market", async () => {
  let deployer, user;
  let bidMarket;
  let vaultAccounting;
  let vaultManagement;
  let vaultNames;
  let testERC721;
  let cryptoPunks;

  beforeEach(async () => {
    ({ bidMarket, vaultAccounting, vaultManagement, vaultNames, testERC721, cryptoPunks } = await fixture());
    [deployer, user] = await ethers.getSigners();
    bidMarket = bidMarket.connect(user);

    // deposit eth in vault
    const emptyVault = await ethers.getContractAt("IVault", await vaultManagement.getVault(vaultNames.empty));
    const amount = ethers.utils.parseEther("1.0");
    await vaultAccounting.connect(user).deposit(vaultNames.empty, { value: amount });
  });

  describe("Placing bids", async () => {
    it("should successfully place a bid", async () => {
      const bidAmount = ethers.utils.parseEther("0.5");
      const nftId = 0;

      await expect(bidMarket.placeBid([vaultNames.empty, testERC721.address, nftId, bidAmount]))
        .to.emit(bidMarket, "BidEntered")
        .withArgs(0, bidAmount, vaultNames.empty, testERC721.address, nftId, user.address);
    });

    it("should successfully place a crypto punks bid", async () => {
      const bidAmount = ethers.utils.parseEther("0.5");
      const nftId = 0;

      await expect(bidMarket.placeBid([vaultNames.empty, cryptoPunks.address, nftId, bidAmount]))
        .to.emit(bidMarket, "BidEntered")
        .withArgs(0, bidAmount, vaultNames.empty, cryptoPunks.address, nftId, user.address);
    });

    it("should fail to place a bid of 0 value", async () => {
      const bidAmount = ethers.utils.parseEther("0.0");
      const nftId = 0;

      await expect(bidMarket.placeBid([vaultNames.empty, cryptoPunks.address, nftId, bidAmount])).to.be.revertedWith(
        "Insufficient bid amount"
      );
    });

    it("should fail to place a bid if crypto punks index is invalid", async () => {
      const bidAmount = ethers.utils.parseEther("0.5");
      const nftId = 10000;

      await expect(bidMarket.placeBid([vaultNames.empty, cryptoPunks.address, nftId, bidAmount])).to.be.revertedWith(
        "Punk not found"
      );
    });

    it("should fail to place a bid if nft has no owner", async () => {
      const bidAmount = ethers.utils.parseEther("0.5");
      const nftId = 10000;

      await expect(bidMarket.placeBid([vaultNames.empty, testERC721.address, nftId, bidAmount])).to.be.reverted;
    });

    it("should fail to place a bid if user does not have enough funds deposited", async () => {
      const bidAmount = ethers.utils.parseEther("1.5");
      const nftId = 0;

      await expect(bidMarket.placeBid([vaultNames.empty, testERC721.address, nftId, bidAmount])).to.be.revertedWith(
        "Insufficient funds"
      );
    });

    it("should successfully place multiple bids", async () => {
      const bidAmounts = [ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.6")];
      const nftIds = [0, 1];

      await expect(
        bidMarket.placeMultipleBids([
          [vaultNames.empty, testERC721.address, nftIds[0], bidAmounts[0]],
          [vaultNames.empty, testERC721.address, nftIds[1], bidAmounts[1]],
        ])
      ).to.not.be.reverted;
    });
  });

  describe("Modifying bids", async () => {
    beforeEach(async () => {
      const bidAmount = ethers.utils.parseEther("0.5");
      await bidMarket.placeBid([vaultNames.empty, testERC721.address, 0, bidAmount]);
    });

    it("should successfully modify a bid", async () => {
      const newBidAmount = ethers.utils.parseEther("0.6");

      await expect(bidMarket.modifyBid(0, newBidAmount)).to.emit(bidMarket, "BidModified").withArgs(0, newBidAmount);
    });

    it("should fail to modified bid of another bidder", async () => {
      const newBidAmount = ethers.utils.parseEther("0.6");

      await expect(bidMarket.connect(deployer).modifyBid(0, newBidAmount)).to.be.revertedWith("Not bid owner");
    });

    it("should fail to modify bid with 0 bid amount", async () => {
      const newBidAmount = ethers.utils.parseEther("0.0");

      await expect(bidMarket.modifyBid(0, newBidAmount)).to.be.revertedWith("Insufficient bid amount");
    });

    it("should fail to modify bid with insufficient funds", async () => {
      const newBidAmount = ethers.utils.parseEther("1.5");

      await expect(bidMarket.modifyBid(0, newBidAmount)).to.be.revertedWith("Insufficient funds");
    });

    it("should successfully place multiple bids", async () => {
      // place 2 bids
      let bidAmounts = [ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.6")];
      const nftIds = [0, 1];

      await expect(
        bidMarket.placeMultipleBids([
          [vaultNames.empty, testERC721.address, nftIds[0], bidAmounts[0]],
          [vaultNames.empty, testERC721.address, nftIds[1], bidAmounts[1]],
        ])
      ).to.not.be.reverted;

      // modify 2 bids
      bidAmounts = [ethers.utils.parseEther("0.3"), ethers.utils.parseEther("0.4")];
      await expect(bidMarket.modifyMultipleBids([0, 1], bidAmounts)).to.not.be.reverted;
    });
  });
});
