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
    tx = await vaultAccounting.connect(user).deposit(vaultNames.empty, { value: amount });
    await tx.wait();
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
      tx = await bidMarket.placeBid([vaultNames.empty, testERC721.address, 0, bidAmount]);
      await tx.wait();
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

  describe("Withdrawing bids", async () => {
    beforeEach(async () => {
      // place bid
      const bidAmount = ethers.utils.parseEther("0.5");
      tx = await bidMarket.placeBid([vaultNames.empty, testERC721.address, 0, bidAmount]);
      await tx.wait();
    });

    it("should successfully withdraw a bid", async () => {
      await expect(bidMarket.withdrawBid(0)).to.emit(bidMarket, "BidWithdrawn").withArgs(0, user.address);
    });

    it("should fail to withdraw bid of another user", async () => {
      await expect(bidMarket.connect(deployer).withdrawBid(0)).to.be.revertedWith("Not your bid");
    });

    it("should successfully withdraw multiple bids", async () => {
      // place another bid
      const bidAmount = ethers.utils.parseEther("0.5");
      tx = await bidMarket.placeBid([vaultNames.empty, testERC721.address, 0, bidAmount]);
      await tx.wait();

      await expect(bidMarket.withdrawMultipleBids([0, 1])).to.not.be.reverted;
    });
  });

  describe("Accepting bids", async () => {
    let bidAmount;
    let bidMarketSeller;

    beforeEach(async () => {
      // place bid
      bidAmount = ethers.utils.parseEther("1.0");
      tx = await bidMarket.placeBid([vaultNames.empty, testERC721.address, 0, bidAmount]);
      await tx.wait();
      tx = await bidMarket.placeBid([vaultNames.empty, cryptoPunks.address, 0, bidAmount]);
      await tx.wait();

      bidMarketSeller = bidMarket.connect(deployer);
    });

    it("should successfully accept bid and emit event", async () => {
      // approve token transfer
      tx = await testERC721.approve(bidMarket.address, 0);
      await tx.wait();

      await expect(bidMarketSeller.acceptBid(0))
        .to.emit(bidMarketSeller, "BidAccepted")
        .withArgs(0, user.address, deployer.address, bidAmount);
    });

    it("should successfully accept bid and seller should receive bid amount", async () => {
      // approve token transfer
      tx = await testERC721.approve(bidMarket.address, 0);
      await tx.wait();

      await expect(await bidMarketSeller.acceptBid(0)).to.changeEtherBalance(deployer, bidAmount);
    });

    it("should successfully accept bid and buyer should be new owner of the NFT", async () => {
      // approve token transfer
      tx = await testERC721.approve(bidMarket.address, 0);
      await tx.wait();

      tx = await bidMarketSeller.acceptBid(0);
      await tx.wait();
      expect(await testERC721.ownerOf(0)).to.equal(user.address);
    });

    it("should successfully accept bid and buyer's LP balance should be reflected", async () => {
      // approve token transfer
      tx = await testERC721.approve(bidMarket.address, 0);
      await tx.wait();

      tx = await bidMarketSeller.acceptBid(0);
      await tx.wait();

      expect(await vaultAccounting.userLPTokenBalance(user.address, vaultNames.empty)).to.equal(0);
    });

    it("should successfully accept punk bid and punk marketplace should receive bid amount", async () => {
      // offer punk for sale
      tx = await cryptoPunks.offerPunkForSaleToAddress(0, bidAmount, bidMarket.address);
      await tx.wait();

      await expect(await bidMarketSeller.acceptBid(1)).to.changeEtherBalance(cryptoPunks, bidAmount);
    });

    it("should successfully accept punk bid and transfer punk to bidder", async () => {
      // offer punk for sale
      tx = await cryptoPunks.offerPunkForSaleToAddress(0, bidAmount, bidMarket.address);
      await tx.wait();

      tx = await bidMarketSeller.acceptBid(1);
      await tx.wait();

      expect(await cryptoPunks.punkIndexToAddress(0)).to.equal(user.address);
    });

    it("should fail to accept bid that does not exist", async () => {
      await expect(bidMarketSeller.acceptBid(2)).to.be.revertedWith("Bid does not exist");
    });

    it("should fail to accept bid if bid is no longer valid", async () => {
      // withdraw funds as bidder
      tx = await vaultAccounting.connect(user).withdraw(bidAmount, vaultNames.empty);
      await tx.wait();

      // approve token transfer
      tx = await testERC721.approve(bidMarket.address, 0);
      await tx.wait();

      await expect(bidMarketSeller.acceptBid(0)).to.be.revertedWith("Bid no longer valid");
    });

    it("should fail to accept bid if not the owner of the NFT", async () => {
      await expect(bidMarket.acceptBid(0)).to.be.revertedWith("Not your NFT");
    });

    it("should fail to accept bid if not the owner of the crypto punk", async () => {
      await expect(bidMarket.acceptBid(1)).to.be.revertedWith("Not your punk");
    });
  });
});
