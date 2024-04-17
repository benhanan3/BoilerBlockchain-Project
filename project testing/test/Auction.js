// test/Auction.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Auction", function () {
  let Auction;
  let auction;
  let owner;
  let bidder;

  beforeEach(async function () {
    [owner, bidder] = await ethers.getSigners();

    // Deploy MockERC721 contract
    const MockERC721 = await ethers.getContractFactory("MockERC721");
    const mockNFTContract = await MockERC721.deploy();

    // Deploy Auction contract
    Auction = await ethers.getContractFactory("Auction");
    auction = await Auction.deploy(mockNFTContract.address, 1, ethers.utils.parseEther("1"));
  });

  it("should place a bid", async function () {
    const initialBalance = await bidder.getBalance();
    const bidAmount = ethers.utils.parseEther("2");

    // Place a bid
    await auction.connect(bidder).bid({ value: bidAmount });

    // Check if Bid event emitted
    const bidEvent = (await auction.queryFilter("Bid"))[0];
    expect(bidEvent.args.bidder).to.equal(bidder.address);
    expect(bidEvent.args.amount).to.equal(bidAmount);

    // Check if bidPlaced flag updated
    expect(await auction.bidPlaced()).to.equal(true);

    // Check if maxBidder updated
    expect(await auction.maxBidder()).to.equal(bidder.address);

    // Check if minimumBid updated
    expect(await auction.minimumBid()).to.equal(bidAmount);

    // Check if bid amount transferred to contract
    const contractBalance = await ethers.provider.getBalance(auction.address);
    expect(contractBalance).to.equal(bidAmount);

    // Check if bidder's balance decreased
    const finalBalance = await bidder.getBalance();
    expect(finalBalance.lt(initialBalance)).to.equal(true);
  });

  it("should settle the auction", async function () {
    const initialBalance = await owner.getBalance();
    const bidAmount = ethers.utils.parseEther("2");

    // Place a bid
    await auction.connect(bidder).bid({ value: bidAmount });

    // Settle the auction
    await auction.connect(owner).settleAuction();

    // Check if auctionEnded flag updated
    expect(await auction.auctionEnded()).to.equal(true);

    // Check if NFT transferred to maxBidder
    const nftOwner = await auction.NFT().ownerOf(1);
    expect(nftOwner).to.equal(bidder.address);

    // Check if funds transferred to beneficiary
    const finalBalance = await owner.getBalance();
    expect(finalBalance.gt(initialBalance)).to.equal(true);
  });
});
