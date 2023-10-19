// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "hardhat/console.sol";

contract FakeSafe {
    mapping(address => bool) public modules;
    address[] public owners;
    uint256 public threshold;
    uint256 public nonce = 0;

    constructor(address[] memory _owners, uint256 _threshold) {
        owners = _owners;
        threshold = _threshold;
    }

    function execTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        bytes memory signatures
    ) external payable returns (bool success) {
        nonce++;
        return true;
    }

    function enableModule(address module) external {
        modules[module] = true;
    }

    function disableModule(address module) external {
        modules[module] = false;
    }

    function getChainId() external view returns (uint256) {
        return block.chainid;
    }

    function swapOwner(
        address prevOwner,
        address oldOwner,
        address newOwner
    ) external {
        require(
            msg.sender == prevOwner || modules[msg.sender],
            "Only prevOwner can call this"
        );
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == oldOwner) {
                owners[i] = newOwner;
            }
        }
    }

    function isOwner(address owner) external view returns (bool) {
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == owner) {
                return true;
            }
        }
    }

    function isModuleEnabled(address module) external view returns (bool) {
        return modules[module];
    }

    function getThreshold() external view returns (uint256) {
        return threshold;
    }

    function addOwnerWithThreshold(address owner, uint256 _threshold) external {
        owners.push(owner);
        threshold = _threshold;
    }
}
