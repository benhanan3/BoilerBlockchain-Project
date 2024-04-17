// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/utils/Strings.sol";

interface IERC721 {
    function transfer(address, uint) external;

    function transferFrom(
        address,
        address,
        uint
    ) external;
}
contract Auction {
    event Bid (address indexed bidder, uint amount);

    IERC721 public NFT;
    uint public nftId;

    address payable public beneficiary ;
    uint256 public minimumBid ;
    address public maxBidder ;
    bool public auctionEnded ;
    bool public bidPlaced;
    uint256 public numBids;
    uint256 public auctionEndAt;

    // Constructor
    constructor (IERC721 _NFT, uint _nftId, uint256 _minimumBid) {
        minimumBid = _minimumBid;
        beneficiary = payable (msg.sender);
        auctionEnded = false;
        bidPlaced = false;

        NFT = _NFT;
        nftId = _nftId;
        //This fails if the person does not own the NFT
        NFT.transferFrom(beneficiary, address(this), nftId);

        // block is the "Block" of the BlockChain, where our contract is deployed
        auctionEndAt = block.timestamp + 2 hours;
    }

    // Function to place a bid
    function bid () external payable {
        require(auctionEnded == false, "Auction Ended!");
        require(msg.sender != maxBidder, "Increase your Bid!");
        require(msg.value > minimumBid, "Bid less than minimum bid.");
        address acc_address = msg.sender;
        uint256 bidAmount = msg.value;
        if (bidPlaced == true) {
            //We send back only if the first transaction has taken place

            (bool sent_back, ) = maxBidder.call{value: minimumBid}("");
            require(sent_back, "Failed to send Ether");
        }
        bidPlaced = true;
        minimumBid = bidAmount;
        maxBidder = acc_address;
        //We do not need to send the money to the contract payable keyword already does that
        emit Bid(msg.sender, msg.value);
    }
    
    // Function to end the auction
    function settleAuction () external {
        require(msg.sender == beneficiary);
        require(!auctionEnded, "Auction has already ended!");
        if (block.timestamp < auctionEndAt) {
            uint256 timeLeft = auctionEndAt - block.timestamp;

            // Convert the timeLeft to a string
            string memory timeLeftString = Strings.toString(timeLeft);
            
            // Construct the error message
            string memory errorMessage = string(abi.encodePacked("Too soon! Time left: ", timeLeftString, " seconds."));
            revert(errorMessage);
        }
        auctionEnded = true;
        if (bidPlaced == false) {
            // I did not understand why we needed to do this.
            maxBidder = beneficiary;
            NFT.transfer(maxBidder, nftId);      
        }
        else {
            (bool sent,) = beneficiary.call{value: minimumBid}("");
            require(sent, "Failed to send Ether");
            NFT.transfer(maxBidder, nftId);
        }
    }
}