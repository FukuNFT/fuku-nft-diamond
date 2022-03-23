const { ethers } = require("hardhat");
const { expect } = require("chai");

const { fixture } = require("./fixture");

describe("Option Market", async () => {
  let deployer, user;
  let optionMarket;
  let vaultAccounting;
  let vaultManagement;
  let vaultNames;
  let testERC721;
  let cryptoPunks;

  beforeEach(async () => {
    ({ optionMarket, vaultAccounting, vaultManagement, vaultNames, testERC721, cryptoPunks } = await fixture());
    [deployer, user] = await ethers.getSigners();
    optionMarket = optionMarket.connect(user);

    // deposit eth in vault
    const emptyVault = await ethers.getContractAt("IVault", await vaultManagement.getVault(vaultNames.empty));
    const amount = ethers.utils.parseEther("1.0");
    await vaultAccounting.connect(user).deposit(vaultNames.empty, { value: amount });
  });

  describe("Placing option bids", async () => {
    it("should successfully place an option bid", async () => {
      const bidAmount = ethers.utils.parseEther("0.5");
      const premium = ethers.utils.parseEther("0.5");
      const bidInput = [vaultNames.empty, testERC721.address, 0, bidAmount];

      await expect(optionMarket.placeOptionBid([bidInput, premium, 0]))
        .to.emit(optionMarket, "OptionBidEntered")
        .withArgs(0, bidAmount, premium, 0, vaultNames.empty, testERC721.address, 0, user.address);
    });

    it("should successfully place a crypto punks option bid", async () => {
      const bidAmount = ethers.utils.parseEther("0.5");
      const premium = ethers.utils.parseEther("0.5");
      const bidInput = [vaultNames.empty, cryptoPunks.address, 0, bidAmount];

      await expect(optionMarket.placeOptionBid([bidInput, premium, 0]))
        .to.emit(optionMarket, "OptionBidEntered")
        .withArgs(0, bidAmount, premium, 0, vaultNames.empty, cryptoPunks.address, 0, user.address);
    });

    it("should fail to place option bid if strike amount is 0", async () => {
      const bidAmount = ethers.utils.parseEther("0.0");
      const premium = ethers.utils.parseEther("0.5");
      const bidInput = [vaultNames.empty, testERC721.address, 0, bidAmount];

      await expect(optionMarket.placeOptionBid([bidInput, premium, 0])).to.be.revertedWith(
        "Insufficient strike and premium amounts"
      );
    });

    it("should fail to place option bid if premium amount is 0", async () => {
      const bidAmount = ethers.utils.parseEther("0.5");
      const premium = ethers.utils.parseEther("0.0");
      const bidInput = [vaultNames.empty, testERC721.address, 0, bidAmount];

      await expect(optionMarket.placeOptionBid([bidInput, premium, 0])).to.be.revertedWith(
        "Insufficient strike and premium amounts"
      );
    });

    it("should fail to place option bid if crypto punks index is invalid", async () => {
      const bidAmount = ethers.utils.parseEther("0.5");
      const premium = ethers.utils.parseEther("0.5");
      const bidInput = [vaultNames.empty, cryptoPunks.address, 10000, bidAmount];

      await expect(optionMarket.placeOptionBid([bidInput, premium, 0])).to.be.revertedWith("Punk not found");
    });

    it("should fail to place option bid if crypto punk is already locked up in market", async () => {
      const bidAmount = ethers.utils.parseEther("0.5");
      const premium = ethers.utils.parseEther("0.5");
      const bidInput = [vaultNames.empty, cryptoPunks.address, 0, bidAmount];

      // send crypto punk to diamond
      await cryptoPunks.transferPunk(optionMarket.address, 0);

      await expect(optionMarket.placeOptionBid([bidInput, premium, 0])).to.be.revertedWith("Already in option");
    });

    it("should fail to place option bid if NFT index is invalid", async () => {
      const bidAmount = ethers.utils.parseEther("0.5");
      const premium = ethers.utils.parseEther("0.5");
      const bidInput = [vaultNames.empty, testERC721.address, 10000, bidAmount];

      await expect(optionMarket.placeOptionBid([bidInput, premium, 0])).to.be.reverted;
    });

    it("should fail to place option bid if NFT is already locked up in market", async () => {
      const bidAmount = ethers.utils.parseEther("0.5");
      const premium = ethers.utils.parseEther("0.5");
      const bidInput = [vaultNames.empty, testERC721.address, 0, bidAmount];

      // transfer nft to diamond
      await testERC721.transferFrom(deployer.address, optionMarket.address, 0);

      await expect(optionMarket.placeOptionBid([bidInput, premium, 0])).to.be.revertedWith("Already in option");
    });

    it("should fail to place option bid if user cannot pay premium", async () => {
      const bidAmount = ethers.utils.parseEther("0.5");
      const premium = ethers.utils.parseEther("1.5");
      const bidInput = [vaultNames.empty, testERC721.address, 0, bidAmount];

      await expect(optionMarket.placeOptionBid([bidInput, premium, 0])).to.be.revertedWith("Insufficient funds");
    });
  });

  describe("Modifying option bids", async () => {
    const bidAmount = ethers.utils.parseEther("0.5");
    const premium = ethers.utils.parseEther("0.5");
    const duration = 0; // 0 is 30 days, 1 is 90 days

    beforeEach(async () => {
      const bidInput = [vaultNames.empty, testERC721.address, 0, bidAmount];

      // place an options bid
      await optionMarket.placeOptionBid([bidInput, premium, duration]);
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
      await testERC721.approve(optionMarket.address, 0);

      // accept bid
      await optionMarket.connect(deployer).acceptOptionBid(0);

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
});
