// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";

contract RenewVault {
    error InvalidAddress();
    error InvalidAmount();
    error NotOwner();
    error NotProtocol();
    error ProtocolAlreadyConfigured();
    error InsufficientBalance();
    error TransferFailed();

    event ProtocolConfigured(address indexed protocol);
    event MerchantBalanceCredited(
        address indexed merchant,
        uint256 grossAmount,
        uint256 feeAmount,
        uint256 netAmount
    );
    event MerchantWithdrawal(address indexed merchant, address indexed to, uint256 amount);
    event ProtocolFeesWithdrawn(address indexed to, uint256 amount);

    IERC20 public immutable settlementAsset;
    address public immutable owner;
    address public protocol;

    mapping(address => uint256) public merchantBalances;
    uint256 public protocolFeeBalance;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyProtocol() {
        if (msg.sender != protocol) revert NotProtocol();
        _;
    }

    constructor(address settlementAsset_, address owner_) {
        if (settlementAsset_ == address(0) || owner_ == address(0)) revert InvalidAddress();

        settlementAsset = IERC20(settlementAsset_);
        owner = owner_;
    }

    function setProtocol(address protocol_) external onlyOwner {
        if (protocol_ == address(0)) revert InvalidAddress();
        if (protocol != address(0) && protocol != protocol_) revert ProtocolAlreadyConfigured();

        protocol = protocol_;

        emit ProtocolConfigured(protocol_);
    }

    function creditMerchantBalance(
        address merchant,
        uint256 grossAmount,
        uint256 feeAmount
    ) external onlyProtocol returns (uint256 netAmount) {
        if (merchant == address(0)) revert InvalidAddress();
        if (grossAmount == 0) revert InvalidAmount();
        if (feeAmount > grossAmount) revert InvalidAmount();

        netAmount = grossAmount - feeAmount;

        merchantBalances[merchant] += netAmount;
        protocolFeeBalance += feeAmount;

        emit MerchantBalanceCredited(merchant, grossAmount, feeAmount, netAmount);
    }

    function withdrawMerchantBalance(
        address merchant,
        address to,
        uint256 amount
    ) external onlyProtocol {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (merchantBalances[merchant] < amount) revert InsufficientBalance();

        merchantBalances[merchant] -= amount;

        if (!settlementAsset.transfer(to, amount)) revert TransferFailed();

        emit MerchantWithdrawal(merchant, to, amount);
    }

    function withdrawProtocolFees(address to, uint256 amount) external onlyProtocol {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (protocolFeeBalance < amount) revert InsufficientBalance();

        protocolFeeBalance -= amount;

        if (!settlementAsset.transfer(to, amount)) revert TransferFailed();

        emit ProtocolFeesWithdrawn(to, amount);
    }
}

