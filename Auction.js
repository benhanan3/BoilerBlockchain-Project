const {
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

const MINMUM_BID = 3;
const INITIAL_BID_VALUE = 10;

describe("Auction", function () {
    
    async function deployFixture() {
      
      // Contracts are deployed using the first signer/account by default
      const [beneficiary, otherAccount, otherAccount2] = await ethers.getSigners();
  
      const AuctionFacotory = await ethers.getContractFactory("Auction");
      const contract = await AuctionFacotory.deploy(MINMUM_BID, beneficiary);
  
      return { contract, beneficiary, otherAccount, otherAccount2 };
    }

    async function bidAlreadySubmittedFixture() {
        const { contract, beneficiary, otherAccount, otherAccount2} = await loadFixture(deployFixture)

        await contract.connect(otherAccount).bid( {value: INITIAL_BID_VALUE})

        return {contract, beneficiary, otherAccount, otherAccount2 }
    }

    async function auctionEndedFixture() {
        const { contract, beneficiary, otherAccount, otherAccount2} = await loadFixture(bidAlreadySubmittedFixture)

        await contract.connect(beneficiary).settleAuction()

        return {contract, beneficiary, otherAccount, otherAccount2 }
    }

    describe("Constructor - 10 points", function () {
        it("Should set minimumBid and beneficiary to values passed into constructor (+10 points)", async function () {
            const [beneficiary, otherAccount] = await ethers.getSigners();
  
            const AuctionFacotory = await ethers.getContractFactory("Auction");
            const auction = await AuctionFacotory.deploy( MINMUM_BID, beneficiary);
        
            let contractBeneficiary = await auction.beneficiary();
            let contractMinimumBid = await auction.minimumBid();

            expect(contractBeneficiary).to.equal(beneficiary);
            expect(contractMinimumBid).to.equal(MINMUM_BID);
        })
    })

    describe("Bid - 40 points", function () {
        it("Should not allow the current maxBidder to bid again (+6 points)", async function() {
            const { contract, beneficiary, otherAccount, otherAccount2} = await loadFixture(bidAlreadySubmittedFixture)
            await expect(contract.connect(otherAccount).bid( {value: INITIAL_BID_VALUE + 1})).to.be.reverted

        })
        it("Should fail if the value sent is not greater than the required minimum bid (+6 points)", async function() {
            const { contract, beneficiary, otherAccount, otherAccount2} = await loadFixture(bidAlreadySubmittedFixture)
            let bid = (await contract.minimumBid()) - BigInt(1)
            await expect(contract.connect(otherAccount).bid( {value: bid})).to.be.reverted

        })
        it("Should not allow bids if the auction has already ended (+6 points)", async function() {
            const { contract, beneficiary, otherAccount, otherAccount2} = await loadFixture(auctionEndedFixture)

            await expect(contract.connect(otherAccount2).bid( {value: INITIAL_BID_VALUE + 1})).to.be.reverted

        })
        it("Should not transfer any funds if bid is called the first time (+6 points)", async function() {
            const { contract, beneficiary, otherAccount, otherAccount2} = await loadFixture(deployFixture)

            await expect(contract.connect(otherAccount).bid({value: INITIAL_BID_VALUE})).to.changeEtherBalances(
                [contract.target, otherAccount, ethers.ZeroAddress],
                [INITIAL_BID_VALUE, -INITIAL_BID_VALUE, 0]
            );
        })
        it("Should transfer funds if bid is called and conditions satisfied (+10 points)", async function() {
            const { contract, beneficiary, otherAccount, otherAccount2} = await loadFixture(bidAlreadySubmittedFixture)

            await expect(contract.connect(otherAccount2).bid({value: INITIAL_BID_VALUE + 1})).to.changeEtherBalances(
                [contract.target, otherAccount2, otherAccount],
                [1, -INITIAL_BID_VALUE - 1, INITIAL_BID_VALUE]
            );
        })
        it("Should set minimumBid and maxBidder to new values after a bid (+6 points)", async function() {
            const { contract, beneficiary, otherAccount, otherAccount2} = await loadFixture(bidAlreadySubmittedFixture)
            let contractMinimumBid = await contract.minimumBid()
            let contractMaxBidder = await contract.maxBidder()

            expect(contractMaxBidder).to.equal(otherAccount)
            expect(contractMinimumBid).to.equal(INITIAL_BID_VALUE)
        })
    })

    describe("settleAuction - 40 points", function() {
        it("Should only allow beneficiary to settle auction (+10 points)", async function() {
            const { contract, beneficiary, otherAccount, otherAccount2} = await loadFixture(bidAlreadySubmittedFixture)
            
            await expect(contract.connect(otherAccount).settleAuction()).to.be.reverted
        })
        it("Should revert if called after auction has already ended (+10 points)", async function() {
            const { contract, beneficiary, otherAccount, otherAccount2} = await loadFixture(auctionEndedFixture)
            
            await expect(contract.connect(beneficiary).settleAuction()).to.be.reverted
        })
        it("Should set maxBidder to beneficiary and change no balances if no one bidded before auction ended (+10 points)", async function() {
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
        it("Should transfer payment to beneficiary and end auction if bids were submitted before settleAuction is called (+10 points)", async function() {
            const { contract, beneficiary, otherAccount, otherAccount2} = await loadFixture(bidAlreadySubmittedFixture)
            let contractMaxBidder = await contract.maxBidder();
            await expect(contract.connect(beneficiary).settleAuction()).to.changeEtherBalances(
                [beneficiary, contractMaxBidder, ethers.ZeroAddress],
                [INITIAL_BID_VALUE, 0, 0]
            )
            expect(contractMaxBidder).to.equal(otherAccount)
            let contractSettleAuction = await contract.auctionEnded()
            expect(contractSettleAuction).to.equal(true)
        })
    })
})