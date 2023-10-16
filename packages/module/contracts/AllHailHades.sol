// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "@safe-global/safe-contracts/contracts/common/Enum.sol";
import "@safe-global/safe-contracts/contracts/Safe.sol";

contract AllHailHades {
    string public constant NAME = "All Hail Hades";
    string public constant VERSION = "0.1.0";

    address public owner;
    mapping(address => address) public inhertance;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "You aren't the owner");
        _;
    }

    function setInhertance(address _heir) public {
        inhertance[msg.sender] = _heir;
    }
}
