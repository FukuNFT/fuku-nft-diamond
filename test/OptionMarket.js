const { ethers } = require("hardhat");
const { expect } = require("chai");

const { fixture } = require("./fixture");

describe("Option Market", async () => {
  // fixture values
  let deployer, user;
  let optionMarket;
  let vaultAccounting;
  let vaultNames;
  let testERC721;
  let cryptoPunks;

  // bidding parameters
  let bidAmount;
  let premium;
  let duration;
  let bidInput;
  let punksBidInput;

  // constants
  let THIRTY_DAYS;

  beforeEach(async () => {
    // initialize fixture values
    ({ optionMarket, vaultAccounting, vaultNames, testERC721, cryptoPunks } = await fixture());
    [deployer, user] = await ethers.getSigners();
    optionMarket = optionMarket.connect(user);

    // initialize bidding parameterss
    bidAmount = ethers.utils.parseEther("0.5");
    premium = ethers.utils.parseEther("0.75");
    duration = 0; // 0 is 30 days, 1 is 90 days
    bidInput = [vaultNames.empty, testERC721.address, 0, bidAmount];
    punksBidInput = [vaultNames.empty, cryptoPunks.address, 0, bidAmount];

    // initialize constants
    THIRTY_DAYS = 2592000;

    // deposit eth in vault
    const amount = ethers.utils.parseEther("1.0");
    tx = await vaultAccounting.connect(user).deposit(vaultNames.empty, { value: amount });
    await tx.wait();
  });

  describe("Placing option bids", async () => {
    it("should successfully place an option bid", async () => {
      await expect(optionMarket.placeOptionBid([bidInput, premium, duration]))
        .to.emit(optionMarket, "OptionBidEntered")
        .withArgs(0, bidAmount, premium, 0, vaultNames.empty, testERC721.address, 0, user.address);
    });

    it("should successfully place a crypto punks option bid", async () => {
      await expect(optionMarket.placeOptionBid([punksBidInput, premium, duration]))
        .to.emit(optionMarket, "OptionBidEntered")
        .withArgs(0, bidAmount, premium, 0, vaultNames.empty, cryptoPunks.address, 0, user.address);
    });

    it("should fail to place option bid if strike amount is 0", async () => {
      const newBidAmount = ethers.utils.parseEther("0.0");
      const newBidInput = [vaultNames.empty, testERC721.address, 0, newBidAmount];

      await expect(optionMarket.placeOptionBid([newBidInput, premium, duration])).to.be.revertedWith(
        "Insufficient strike and premium amounts"
      );
    });

    it("should fail to place option bid if premium amount is 0", async () => {
      const newPremium = ethers.utils.parseEther("0.0");

      await expect(optionMarket.placeOptionBid([bidInput, newPremium, duration])).to.be.revertedWith(
        "Insufficient strike and premium amounts"
      );
    });

    it("should fail to place option bid if crypto punks index is invalid", async () => {
      const newBidInput = [vaultNames.empty, cryptoPunks.address, 10000, bidAmount];

      await expect(optionMarket.placeOptionBid([newBidInput, premium, duration])).to.be.revertedWith("Punk not found");
    });

    it("should fail to place option bid if crypto punk is already locked up in market", async () => {
      // send crypto punk to diamond
      tx = await cryptoPunks.transferPunk(optionMarket.address, 0);
      await tx.wait();

      await expect(optionMarket.placeOptionBid([punksBidInput, premium, duration])).to.be.revertedWith(
        "Already in option"
      );
    });

    it("should fail to place option bid if NFT index is invalid", async () => {
      const newBidInput = [vaultNames.empty, testERC721.address, 10000, bidAmount];

      await expect(optionMarket.placeOptionBid([newBidInput, premium, duration])).to.be.reverted;
    });

    it("should fail to place option bid if NFT is already locked up in market", async () => {
      // transfer nft to diamond
      tx = await testERC721.transferFrom(deployer.address, optionMarket.address, 0);
      await tx.wait();

      await expect(optionMarket.placeOptionBid([bidInput, premium, duration])).to.be.revertedWith("Already in option");
    });

    it("should fail to place option bid if user cannot pay premium", async () => {
      const newPremium = ethers.utils.parseEther("1.5");

      await expect(optionMarket.placeOptionBid([bidInput, newPremium, duration])).to.be.revertedWith(
        "Insufficient funds"
      );
    });
  });

  describe("Modifying option bids", async () => {
    beforeEach(async () => {
      // place an options bid
      tx = await optionMarket.placeOptionBid([bidInput, premium, duration]);
      await tx.wait();
    });

    it("should successfully modify strike price", async () => {
      const newBidAmount = ethers.utils.parseEther("0.2");

      await expect(optionMarket.modifyOptionBid(0, newBidAmount, premium, duration))
        .to.emit(optionMarket, "OptionBidModified")
        .withArgs(0, newBidAmount, premium, duration);
    });

    it("should successfully modify premium", async () => {
      const newPremium = ethers.utils.parseEther("0.2");

      await expect(optionMarket.modifyOptionBid(0, bidAmount, newPremium, duration))
        .to.emit(optionMarket, "OptionBidModified")
        .withArgs(0, bidAmount, newPremium, duration);
    });

    it("should successfully modify duration", async () => {
      const newDuration = 1;

      await expect(optionMarket.modifyOptionBid(0, bidAmount, premium, newDuration))
        .to.emit(optionMarket, "OptionBidModified")
        .withArgs(0, bidAmount, premium, newDuration);
    });

    it("should fail to modify option bid if not the owner", async () => {
      await expect(optionMarket.connect(deployer).modifyOptionBid(0, bidAmount, premium, duration)).to.be.revertedWith(
        "Not your bid"
      );
    });

    it("should fail to modify option bid if already accepted", async () => {
      // approve nft
      tx = await testERC721.approve(optionMarket.address, 0);
      await tx.wait();

      // accept bid
      tx = await optionMarket.connect(deployer).acceptOptionBid(0);
      await tx.wait();

      await expect(optionMarket.modifyOptionBid(0, bidAmount, premium, duration)).to.be.revertedWith(
        "Option already accepted"
      );
    });

    it("should fail to modify option bid if new strike is 0", async () => {
      const newBidAmount = ethers.utils.parseEther("0.0");

      await expect(optionMarket.modifyOptionBid(0, newBidAmount, premium, duration)).to.be.revertedWith(
        "Insufficient strike and premium amounts"
      );
    });

    it("should fail to modify option bid if new premium is 0", async () => {
      const newPremium = ethers.utils.parseEther("0.0");

      await expect(optionMarket.modifyOptionBid(0, bidAmount, newPremium, duration)).to.be.revertedWith(
        "Insufficient strike and premium amounts"
      );
    });

    it("should fail to modify option bid if bidder cannot cover the premium", async () => {
      const newPremium = ethers.utils.parseEther("2.0");

      await expect(optionMarket.modifyOptionBid(0, bidAmount, newPremium, duration)).to.be.revertedWith(
        "Insufficient funds"
      );
    });
  });

  describe("Withdrawing option bids", async () => {
    beforeEach(async () => {
      // place an options bid
      tx = await optionMarket.placeOptionBid([bidInput, premium, duration]);
      await tx.wait();
    });

    it("should successfully withdraw an option bid", async () => {
      await expect(optionMarket.withdrawOptionBid(0))
        .to.emit(optionMarket, "OptionBidWithdrawn")
        .withArgs(0, user.address);
    });

    it("should fail to withdraw an option bid if not owner", async () => {
      await expect(optionMarket.connect(deployer).withdrawOptionBid(0)).to.be.revertedWith("Not your bid");
    });

    it("should fail to withdraw an option bid if it has already been accepted", async () => {
      // approve nft
      tx = await testERC721.approve(optionMarket.address, 0);
      await tx.wait();

      // accept bid
      tx = await optionMarket.connect(deployer).acceptOptionBid(0);
      await tx.wait();

      await expect(optionMarket.withdrawOptionBid(0)).to.be.revertedWith("Option already accepted");
    });
  });

  describe("Accepting option bids", async () => {
    beforeEach(async () => {
      // place an options bid
      tx = await optionMarket.placeOptionBid([bidInput, premium, duration]);
      await tx.wait();

      // approve nft
      tx = await testERC721.approve(optionMarket.address, 0);
      await tx.wait();

      // place punk option bid
      tx = await optionMarket.placeOptionBid([punksBidInput, premium, duration]);
      await tx.wait();

      // approve punk
      tx = await cryptoPunks.offerPunkForSaleToAddress(0, premium, optionMarket.address);
      await tx.wait();
    });

    it("should successfully accept option bid and emit event", async () => {
      await expect(optionMarket.connect(deployer).acceptOptionBid(0))
        .to.emit(optionMarket, "OptionBidAccepted")
        .withArgs(
          0,
          user.address,
          deployer.address,
          bidAmount,
          premium,
          (await ethers.provider.getBlock("latest")).timestamp + THIRTY_DAYS
        );
    });

    it("should successfully acception punk option bid and emit event", async () => {
      await expect(optionMarket.connect(deployer).acceptOptionBid(1))
        .to.emit(optionMarket, "OptionBidAccepted")
        .withArgs(
          1,
          user.address,
          deployer.address,
          bidAmount,
          premium,
          (await ethers.provider.getBlock("latest")).timestamp + THIRTY_DAYS
        );
    });

    it("should successfully accept option bid and transfer premium to seller", async () => {
      await expect(await optionMarket.connect(deployer).acceptOptionBid(0)).to.changeEtherBalance(deployer, premium);
    });

    it("should successfully accept option bid and hold NFT in escrow", async () => {
      tx = await optionMarket.connect(deployer).acceptOptionBid(0);
      await tx.wait();

      expect(await testERC721.ownerOf(0)).to.equal(optionMarket.address);
    });

    it("should successfully accept option bid and hold crypto punk in escrow", async () => {
      tx = await optionMarket.connect(deployer).acceptOptionBid(1);
      await tx.wait();

      expect(await cryptoPunks.punkIndexToAddress(0)).to.equal(optionMarket.address);
    });

    it("should fail to accept option bid that does not exist", async () => {
      await expect(optionMarket.connect(deployer).acceptOptionBid(2)).to.be.revertedWith("Option does not exist");
    });

    it("should fail to accept option bid twice", async () => {
      tx = await optionMarket.connect(deployer).acceptOptionBid(0);
      await tx.wait();

      await expect(optionMarket.connect(deployer).acceptOptionBid(0)).to.be.revertedWith("Option already accepted");
    });

    it("should fail to accept option bid if bidder cannot cover premium", async () => {
      tx = await optionMarket.connect(deployer).acceptOptionBid(0);
      await tx.wait();

      await expect(optionMarket.connect(deployer).acceptOptionBid(1)).to.be.revertedWith("Option no longer valid");
    });

    it("should fail to accept option bid if not owner of NFT", async () => {
      await expect(optionMarket.acceptOptionBid(0)).to.be.revertedWith("Not your NFT");
    });

    it("should fail to accept option bid if not owner of crypto punk", async () => {
      await expect(optionMarket.acceptOptionBid(1)).to.be.revertedWith("Not your punk");
    });
  });

  describe("Exercising option bids", async () => {
    beforeEach(async () => {
      // deposit more funds
      const amount = ethers.utils.parseEther("3.0");
      tx = await vaultAccounting.connect(user).deposit(vaultNames.empty, { value: amount });
      await tx.wait();

      // place an options bid
      tx = await optionMarket.placeOptionBid([bidInput, premium, duration]);
      await tx.wait();

      // approve nft
      tx = await testERC721.approve(optionMarket.address, 0);
      await tx.wait();

      // accept nft option bid
      tx = await optionMarket.connect(deployer).acceptOptionBid(0);
      await tx.wait();
    });

    it("should successfully exercise option and emit an event", async () => {
      await expect(optionMarket.exerciseOption(0))
        .to.emit(optionMarket, "OptionExercised")
        .withArgs(0, user.address, bidAmount, testERC721.address, 0);
    });

    it("should successfully exercise option and transfer strike amount", async () => {
      await expect(await optionMarket.exerciseOption(0)).to.changeEtherBalance(deployer, bidAmount);
    });

    it("should successfully exercise option and transfer NFT to bidder", async () => {
      tx = await optionMarket.exerciseOption(0);
      await tx.wait();

      expect(await testERC721.ownerOf(0)).to.equal(user.address);
    });

    it("should successfully exercise option and transfer punk to bidder", async () => {
      // place punk option bid
      tx = await optionMarket.placeOptionBid([punksBidInput, premium, duration]);
      await tx.wait();

      // approve punk
      tx = await cryptoPunks.offerPunkForSaleToAddress(0, premium, optionMarket.address);
      await tx.wait();

      // accept punk option bid
      tx = await optionMarket.connect(deployer).acceptOptionBid(1);
      await tx.wait();

      tx = await optionMarket.exerciseOption(1);
      await tx.wait();

      expect(await cryptoPunks.punkIndexToAddress(0)).to.equal(user.address);
    });

    it("should fail to exercise option that has not been accepted", async () => {
      // place punk option bid
      tx = await optionMarket.placeOptionBid([punksBidInput, premium, duration]);
      await tx.wait();

      await expect(optionMarket.exerciseOption(1)).to.be.revertedWith("Option is not exercisable");
    });

    it("should fail to exercise option if not owner", async () => {
      await expect(optionMarket.connect(deployer).exerciseOption(0)).to.be.revertedWith("Not your option");
    });

    it("should fail to exercise option if bidder no longer has the funds", async () => {
      // withdraw
      const amount = ethers.utils.parseEther("3.0");
      tx = await vaultAccounting.connect(user).withdraw(amount, vaultNames.empty);
      await tx.wait();

      await expect(optionMarket.exerciseOption(0)).to.be.revertedWith("Bid no longer valid");
    });
  });

  describe("Closing option bids", async () => {
    beforeEach(async () => {
      // deposit more funds
      const amount = ethers.utils.parseEther("3.0");
      tx = await vaultAccounting.connect(user).deposit(vaultNames.empty, { value: amount });
      await tx.wait();

      // place an options bid
      tx = await optionMarket.placeOptionBid([bidInput, premium, duration]);
      await tx.wait();

      // approve nft
      tx = await testERC721.approve(optionMarket.address, 0);
      await tx.wait();

      // accept nft option bid
      tx = await optionMarket.connect(deployer).acceptOptionBid(0);
      await tx.wait();
    });

    it("should successfully close an option bid and emit event", async () => {
      // advance time past expiry
      await ethers.provider.send("evm_increaseTime", [THIRTY_DAYS]);
      await ethers.provider.send("evm_mine");

      await expect(optionMarket.connect(deployer).closeOption(0)).to.emit(optionMarket, "OptionClosed").withArgs(0);
    });

    it("should successfully close an option bid and send NFT back to seller", async () => {
      // advance time past expiry
      await ethers.provider.send("evm_increaseTime", [THIRTY_DAYS]);
      await ethers.provider.send("evm_mine");

      tx = await optionMarket.connect(deployer).closeOption(0);
      await tx.wait();

      expect(await testERC721.ownerOf(0)).to.equal(deployer.address);
    });

    it("should successfully close an option bid and send punk back to seller", async () => {
      // place an options bid
      tx = await optionMarket.placeOptionBid([punksBidInput, premium, duration]);
      await tx.wait();

      // approve nft
      tx = await cryptoPunks.offerPunkForSaleToAddress(0, premium, optionMarket.address);
      await tx.wait();

      // accept nft option bid
      tx = await optionMarket.connect(deployer).acceptOptionBid(1);
      await tx.wait();

      // advance time past expiry
      await ethers.provider.send("evm_increaseTime", [THIRTY_DAYS]);
      await ethers.provider.send("evm_mine");

      tx = await optionMarket.connect(deployer).closeOption(1);
      await tx.wait();

      expect(await cryptoPunks.punkIndexToAddress(0)).to.equal(deployer.address);
    });

    it("should fail to close an option bid if not the seller", async () => {
      await expect(optionMarket.closeOption(0)).to.be.revertedWith("Not your option");
    });

    it("should fail to close an option bid if it has not expired", async () => {
      await expect(optionMarket.connect(deployer).closeOption(0)).to.be.revertedWith("Option not expired");
    });
  });
});
