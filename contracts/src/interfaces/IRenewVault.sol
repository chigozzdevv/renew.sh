// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRenewVault {
    function creditMerchantBalance(address merchant, uint256 grossAmount, uint256 feeAmount) external returns (uint256 netAmount);

    function withdrawMerchantBalance(address merchant, address to, uint256 amount) external;

    function withdrawProtocolFees(address to, uint256 amount) external;

    function merchantBalances(address merchant) external view returns (uint256);

    function protocolFeeBalance() external view returns (uint256);
}

