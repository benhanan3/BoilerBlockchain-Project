// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockERC721 {
    address public owner;
    mapping(uint => address) public tokenOwners;

    constructor() {
        owner = msg.sender;
    }

    function mint(address to, uint tokenId) external {
        require(msg.sender == owner, "Only owner can mint");
        tokenOwners[tokenId] = to;
    }

    function transferFrom(address from, address to, uint tokenId) external {
        require(msg.sender == owner || msg.sender == from, "Unauthorized transfer");
        tokenOwners[tokenId] = to;
    }
}