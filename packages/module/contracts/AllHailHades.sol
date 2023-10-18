// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "@safe-global/safe-contracts/contracts/Safe.sol";
import "hardhat/console.sol";

contract AllHailHades {
    string public constant NAME = "AllHailHades";
    string public constant VERSION = "0.1.0";

    mapping(address => mapping(address => Will)) public wills;
    mapping(address => mapping(address => uint256)) public userNonce;
    address[] public users;

    struct EIP712Domain {
        string name;
        string version;
        uint256 chainId;
        address verifyingContract;
    }

    struct Wills {
        address heir;
        address safe;
        uint256 nonce;
    }

    bytes32 DOMAIN_SEPARATOR;

    bytes32 constant WILL_TYPEHASH =
        keccak256("Will(address heir, address safe, uint256 nonce)");

    bytes32 constant EIP712DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name, string version, uint256 chainId, address verifyingContract)"
        );

    struct Will {
        address heir;
        uint256 tip;
        uint256 timeframe;
        uint256 nonce;
        uint256 startedAt;
    }

    event WillSet(
        address safe,
        address owner,
        address heir,
        uint256 tip,
        uint256 timeframe,
        uint256 nonce,
        uint256 startedAt
    );

    event AbortWill(
        address safe,
        address owner,
        address heir,
        uint256 tip,
        uint256 timeframe,
        uint256 nonce
    );

    constructor() {
        DOMAIN_SEPARATOR = hash(
            EIP712Domain({
                name: NAME,
                version: VERSION,
                chainId: block.chainid,
                verifyingContract: address(this)
            })
        );
    }

    function abortInhertiance(address _safe) public {
        Will storage will = wills[msg.sender][_safe];

        require(
            will.nonce == userNonce[msg.sender][_safe],
            "This will has been aborted or already executed."
        );
        require(will.nonce > 0, "No will set for this Safe");

        userNonce[msg.sender][_safe]++;

        delete wills[msg.sender][_safe]; // Remove the will for this particular Safe

        emit AbortWill(
            _safe,
            msg.sender,
            wills[msg.sender][_safe].heir,
            wills[msg.sender][_safe].tip,
            wills[msg.sender][_safe].timeframe,
            userNonce[msg.sender][_safe] - 1
        );
    }

    function setInhertance(
        address _safe,
        address _heir,
        uint256 _timeframe
    ) public payable {
        require(
            wills[msg.sender][_safe].nonce < userNonce[msg.sender][_safe] ||
                wills[msg.sender][_safe].nonce == 0,
            "This will has been aborted or already executed."
        );

        userNonce[msg.sender][_safe]++;
        wills[msg.sender][_safe] = Will({
            heir: _heir,
            tip: msg.value,
            timeframe: _timeframe,
            nonce: userNonce[msg.sender][_safe],
            startedAt: block.timestamp
        });
        emit WillSet(
            _safe,
            msg.sender,
            _heir,
            msg.value,
            _timeframe,
            userNonce[msg.sender][_safe],
            block.timestamp
        );
    }

    function executeWill(
        bytes memory _signature,
        address _deceased,
        address payable _safe
    ) public {
        // require(Safe(_safe).isModuleEnabled(address(this)), "Module disabled");
        Will storage will = wills[_deceased][_safe];

        console.log(getSigner(will.heir, _safe, will.nonce, _signature));
        console.log(_deceased);
        //Checks
        require(
            getSigner(will.heir, _safe, will.nonce, _signature) == _deceased,
            "Invalid signature"
        );
        require(
            will.startedAt + will.timeframe > block.timestamp,
            "You can not claim yet"
        );
        require(will.tip <= address(this).balance, "Not enough funds");
        require(userNonce[_deceased][_safe] == will.nonce, "Invalid nonce");

        // Safe(_safe).swapOwner(_deceased, _deceased, will.heir);

        // Effects
        uint256 tipAmount = will.tip;
        delete wills[_deceased][_safe];

        // Interactions
        if (tipAmount > 0) {
            payable(msg.sender).transfer(tipAmount);
        }
    }

    function getNonce(
        address _user,
        address _safe
    ) external view returns (uint256) {
        return userNonce[_user][_safe];
    }

    function getSigner(
        address heir,
        address safe,
        uint256 nonce,
        bytes memory _signature
    ) internal view returns (address) {
        string
            memory EIP712_DOMAIN_TYPE = "EIP712Domain(string name, string version, uint256 chainId, address verifyingContract)";
        string
            memory WILL_TYPE = "Will(address heir, address safe, uint256 nonce)";

        console.log(">>>");
        console.log(">", WILL_TYPE);
        console.log(">", EIP712_DOMAIN_TYPE);
        console.log("chainId", block.chainid);
        console.log("verifyingContract", address(this));
        console.log("nonce", nonce);
        console.log("heir", heir);
        console.log("safe", safe);
        console.log("NAME", NAME);
        console.log("VERSION", VERSION);
        bytes32 DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(abi.encodePacked(EIP712_DOMAIN_TYPE)),
                keccak256(abi.encodePacked(NAME)),
                keccak256(abi.encodePacked(VERSION)),
                block.chainid,
                address(this)
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        keccak256(abi.encodePacked(WILL_TYPE)),
                        heir,
                        safe,
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
            return ecrecover(digest, v, r, s);
        }
    }

    // function getSigner(
    //     address heir,
    //     address safe,
    //     uint256 nonce,
    //     bytes memory _signature
    // ) internal view returns (address) {
    //     console.log(">>>");

    //     console.log("chainId", block.chainid);
    //     console.log("verifyingContract", address(this));
    //     console.log("nonce", nonce);
    //     console.log("heir", heir);
    //     console.log("safe", safe);
    //     console.log("NAME", NAME);
    //     console.log("VERSION", VERSION);
    //     bytes32 digest = keccak256(
    //         abi.encodePacked(
    //             "\x19\x01",
    //             DOMAIN_SEPARATOR,
    //             hash(Wills({heir: heir, safe: safe, nonce: nonce}))
    //         )
    //     );

    //     bytes32 r;
    //     bytes32 s;
    //     uint8 v;
    //     if (_signature.length != 65) {
    //         return address(0);
    //     }
    //     assembly {
    //         r := mload(add(_signature, 32))
    //         s := mload(add(_signature, 64))
    //         v := byte(0, mload(add(_signature, 96)))
    //     }
    //     if (v < 27) {
    //         console.log("NOPE");
    //         v += 27;
    //     }
    //     if (v != 27 && v != 28) {
    //         return address(0);
    //     } else {
    //         return ecrecover(digest, v, r, s);
    //     }
    // }

    function hash(Wills memory will) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(WILL_TYPEHASH, will.heir, will.safe, will.nonce)
            );
    }

    function hash(
        EIP712Domain memory eip712Domain
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    EIP712DOMAIN_TYPEHASH,
                    keccak256(bytes(eip712Domain.name)),
                    keccak256(bytes(eip712Domain.version)),
                    eip712Domain.chainId,
                    eip712Domain.verifyingContract
                )
            );
    }
}
