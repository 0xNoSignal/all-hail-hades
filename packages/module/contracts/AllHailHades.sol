// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "@safe-global/safe-contracts/contracts/common/Enum.sol";
import "@safe-global/safe-contracts/contracts/Safe.sol";
import "hardhat/console.sol";

contract AllHailHades {
    string public constant NAME = "All Hail Hades";
    string public constant VERSION = "0.1.0";

    address public owner;
    mapping(address => Will) public inhertance;
    mapping(address => uint256) public userNonce;
    address[] public users;

    struct Will {
        address heir;
        uint256 tip;
        uint256 timeframe;
        uint256 nonce;
    }

    event WillSet(
        address indexed heir,
        uint256 indexed tip,
        uint256 indexed timeframe,
        uint256 nonce
    );

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "You aren't the owner");
        _;
    }

    function abortInhertiance() public {
        userNonce[msg.sender]++;
    }

    function setInhertance(address _heir, uint256 timeframe) public payable {
        if (userNonce[msg.sender] == 0) {
            users.push(msg.sender);
        }
        userNonce[msg.sender]++;
        inhertance[msg.sender] = Will(
            _heir,
            msg.value,
            timeframe,
            userNonce[msg.sender]
        );
        emit WillSet(_heir, msg.value, timeframe, userNonce[msg.sender]);
    }

    function executeWill(bytes memory _signature, address deceased) public {
        Will memory will = inhertance[deceased];

        // Checks
        require(
            getSigner(will.heir, will.nonce, _signature) == deceased,
            "Invalid signature"
        );
        require(
            will.timeframe + 1 days < block.timestamp,
            "You must wait 1 day to claim"
        );
        require(will.tip <= address(this).balance, "Not enough funds");
        require(userNonce[deceased] == will.nonce, "Invalid nonce");

        // Effects
        uint256 tipAmount = will.tip; // Store the tip amount in a temporary variable
        delete inhertance[deceased];

        // Interactions
        if (tipAmount > 0) {
            payable(msg.sender).transfer(tipAmount);
        }
    }

    function getNonce(address _user) external view returns (uint256) {
        return userNonce[_user];
    }

    function getSigner(
        address heir,
        uint256 nonce,
        bytes memory _signature
    ) internal view returns (address) {
        string
            memory EIP712_DOMAIN_TYPE = "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)";
        string memory WILL_TYPE = "Will(address heir,uint256 nonce)";

        bytes32 DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(abi.encodePacked(EIP712_DOMAIN_TYPE)),
                keccak256(abi.encodePacked(NAME)),
                keccak256(abi.encodePacked(VERSION)),
                block.chainid,
                address(this)
            )
        );

        bytes32 hash = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        keccak256(abi.encodePacked(WILL_TYPE)),
                        heir,
                        nonce
                    )
                )
            )
        );

        bytes32 r;
        bytes32 s;
        uint8 v;
        if (_signature.length != 65) {
            return address(0);
        }
        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := byte(0, mload(add(_signature, 96)))
        }
        if (v < 27) {
            v += 27;
        }
        if (v != 27 && v != 28) {
            return address(0);
        } else {
            return ecrecover(hash, v, r, s);
        }
    }

    function getAllWills()
        external
        view
        returns (
            address[] memory heirs,
            uint256[] memory tips,
            uint256[] memory timeframes,
            uint256[] memory nonces
        )
    {
        uint256 length = users.length;

        heirs = new address[](length);
        tips = new uint256[](length);
        timeframes = new uint256[](length);
        nonces = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            Will memory will = inhertance[users[i]];
            heirs[i] = will.heir;
            tips[i] = will.tip;
            timeframes[i] = will.timeframe;
            nonces[i] = will.nonce;
        }
        return (heirs, tips, timeframes, nonces);
    }
}
