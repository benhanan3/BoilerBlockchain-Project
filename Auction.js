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

  describe("Place Bid", function () {
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

    /* HOMEWORK TEST CASES */
    it("Should not allow the current maxBidder to bid again", async function() {
        const { contract, beneficiary, otherAccount, otherAccount2} = await loadFixture(bidAlreadySubmittedFixture)
        await expect(contract.connect(otherAccount).bid( {value: INITIAL_BID_VALUE + 1})).to.be.reverted

    })
    it("Should fail if the value sent is not greater than the required minimum bid", async function() {
        const { contract, beneficiary, otherAccount, otherAccount2} = await loadFixture(bidAlreadySubmittedFixture)
        let bid = (await contract.minimumBid()) - BigInt(1)
        await expect(contract.connect(otherAccount).bid( {value: bid})).to.be.reverted

    })
    it("Should not allow bids if the auction has already ended", async function() {
        const { contract, beneficiary, otherAccount, otherAccount2} = await loadFixture(auctionEndedFixture)

        await expect(contract.connect(otherAccount2).bid( {value: INITIAL_BID_VALUE + 1})).to.be.reverted

    })
    it("Should not transfer any funds if bid is called the first time", async function() {
        const { contract, beneficiary, otherAccount, otherAccount2} = await loadFixture(deployFixture)

        await expect(contract.connect(otherAccount).bid({value: INITIAL_BID_VALUE})).to.changeEtherBalances(
            [contract.target, otherAccount, ethers.ZeroAddress],
            [INITIAL_BID_VALUE, -INITIAL_BID_VALUE, 0]
        );
    })
    it("Should transfer funds if bid is called and conditions satisfied", async function() {
        const { contract, beneficiary, otherAccount, otherAccount2} = await loadFixture(bidAlreadySubmittedFixture)

        await expect(contract.connect(otherAccount2).bid({value: INITIAL_BID_VALUE + 1})).to.changeEtherBalances(
            [contract.target, otherAccount2, otherAccount],
            [1, -INITIAL_BID_VALUE - 1, INITIAL_BID_VALUE]
        );
    })
    it("Should set minimumBid and maxBidder to new values after a bid", async function() {
        const { contract, beneficiary, otherAccount, otherAccount2} = await loadFixture(bidAlreadySubmittedFixture)
        let contractMinimumBid = await contract.minimumBid()
        let contractMaxBidder = await contract.maxBidder()
    })
  });

  describe("Settle the Auction", function () {
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
        it("Should only allow beneficiary to settle auction", async function() {
            const { contract, beneficiary, otherAccount, otherAccount2} = await loadFixture(bidAlreadySubmittedFixture)
        
            await expect(contract.connect(otherAccount).settleAuction()).to.be.reverted
        })
        it("Should revert if called after auction has already ended", async function() {
            const { contract, beneficiary, otherAccount, otherAccount2} = await loadFixture(auctionEndedFixture)
            
            await expect(contract.connect(beneficiary).settleAuction()).to.be.reverted
        })
        it("Should set maxBidder to beneficiary and change no balances if no one bidded before auction ended", async function() {
            const { contract, beneficiary, otherAccount, otherAccount2} = await loadFixture(deployFixture)
            
            await expect(contract.connect(beneficiary).settleAuction()).to.changeEtherBalances(
                [beneficiary, ethers.ZeroAddress],
                [0, 0]
            )

            let contractMaxBidder = await contract.maxBidder()
            expect(contractMaxBidder).to.equal(beneficiary)
            let contractSettleAuction = await contract.auctionEnded()
            expect(contractSettleAuction).to.equal(true)
        })
    })
});
