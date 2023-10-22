// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

interface Safe {
    function isModuleEnabled(address module) external view returns (bool);

    function swapOwner(
        address prevOwner,
        address oldOwner,
        address newOwner
    ) external;
}

contract AllHailHades is EIP712 {
    string public constant NAME = "AllHailHades";
    string public constant VERSION = "0.1.0";

    mapping(address => mapping(address => Will)) public wills;
    mapping(address => mapping(address => uint256)) public userNonce;

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
        uint256 startedAt,
        string ciphertext,
        string dataToEncryptHash
    );

    event AbortWill(
        address safe,
        address owner,
        address heir,
        uint256 tip,
        uint256 timeframe,
        uint256 nonce
    );

    constructor() EIP712(NAME, VERSION) {}

    function abortInheritance(address _safe) public {
        Will storage will = wills[msg.sender][_safe];

        require(will.nonce > 0, "No will set for this Safe");
        require(
            will.nonce == userNonce[msg.sender][_safe],
            "This will has been aborted or already executed."
        );

        address heir = will.heir;
        uint256 tip = will.tip;
        uint256 timeframe = will.timeframe;
        uint256 nonce = will.nonce;

        delete wills[msg.sender][_safe]; // Remove the will for this particular Safe

        emit AbortWill(_safe, msg.sender, heir, tip, timeframe, nonce);
    }

    function setInheritance(
        address _safe,
        address _heir,
        uint256 _timeframe,
        string memory ciphertext,
        string memory dataToEncryptHash
    ) public payable {
        require(_timeframe > 0, "Timeframe must be greater than 0");
        require(_safe != address(0), "Safe address can not be 0");
        require(_heir != address(0), "Heir address can not be 0");
        require(
            wills[msg.sender][_safe].nonce == 0,
            "Existing will found, please abort first"
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
            block.timestamp,
            ciphertext,
            dataToEncryptHash
        );
    }

    function executeWill(
        bytes memory _signature,
        address _deceased,
        address payable _safe
    ) public {
        require(Safe(_safe).isModuleEnabled(address(this)), "Module disabled");
        Will memory will = wills[_deceased][_safe];

        // Check if the will exists
        require(will.nonce > 0, "Will does not exist");

        //Checks
        require(
            getSigner(will.heir, _safe, will.nonce, _signature) == _deceased,
            "Invalid signature"
        );

        require(
            will.startedAt + will.timeframe < block.timestamp,
            "You can not claim yet"
        );
        require(will.tip <= address(this).balance, "Not enough funds");
        require(userNonce[_deceased][_safe] == will.nonce, "Invalid nonce");

        Safe(_safe).swapOwner(_deceased, _deceased, will.heir);

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

    function doesWillExcist(
        address _user,
        address _safe
    ) external view returns (bool) {
        return wills[_user][_safe].nonce > 0;
    }

    function getSigner(
        address heir,
        address safe,
        uint256 nonce,
        bytes memory _signature
    ) internal view returns (address) {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    keccak256("Will(address heir,address safe,uint256 nonce)"),
                    heir,
                    safe,
                    nonce
                )
            )
        );
        address signer = ECDSA.recover(digest, _signature);
        return signer;
    }
}
