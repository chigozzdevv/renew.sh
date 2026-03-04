// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {RenewProtocol} from "../src/RenewProtocol.sol";
import {RenewVault} from "../src/RenewVault.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

interface Vm {
    function prank(address caller) external;
}

contract RenewProtocolTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    MockUSDC private token;
    RenewVault private vault;
    RenewProtocol private protocol;

    address private constant MERCHANT = address(0xA11CE);
    address private constant SETTLEMENT_SOURCE = address(0xB0B);
    address private constant OPERATOR = address(0xCA11);

    function setUp() public {
        token = new MockUSDC();
        vault = new RenewVault(address(token), address(this));
        protocol = new RenewProtocol(address(token), address(vault), address(this), 250);
        vault.setProtocol(address(protocol));

        protocol.setChargeOperator(OPERATOR, true);
        token.mint(SETTLEMENT_SOURCE, 10_000_000e6);

        vm.prank(MERCHANT);
        protocol.registerMerchant(address(0xD00D), bytes32("merchant"));
    }

    function testRegistersPlanAndExecutesCharge() public {
        vm.prank(MERCHANT);
        uint256 planId = protocol.createPlan(
            bytes32("CORE_PLAN"),
            5_000e6,
            30 days,
            0,
            2 days,
            RenewProtocol.BillingMode.Fixed,
            0
        );

        vm.prank(MERCHANT);
        uint256 subscriptionId = protocol.createSubscription(
            planId,
            bytes32("cust_mazi"),
            bytes32("GHS"),
            uint64(block.timestamp),
            5_250e6
        );

        vm.prank(SETTLEMENT_SOURCE);
        token.approve(address(protocol), 5_000e6);

        vm.prank(OPERATOR);
        uint256 chargeId = protocol.executeCharge(
            subscriptionId,
            bytes32("charge_1"),
            SETTLEMENT_SOURCE,
            5_250e6,
            1_050_000,
            5_000e6
        );

        RenewProtocol.Charge memory charge = protocol.getCharge(chargeId);
        RenewProtocol.Subscription memory subscription = protocol.getSubscription(subscriptionId);

        assert(charge.status == RenewProtocol.ChargeStatus.Executed);
        assert(charge.usdcAmount == 5_000e6);
        assert(vault.merchantBalances(MERCHANT) == 4_875e6);
        assert(vault.protocolFeeBalance() == 125e6);
        assert(subscription.lastChargeAt > 0);
        assert(subscription.nextChargeAt > uint64(block.timestamp));
        assert(subscription.retryAvailableAt == 0);
    }

    function testRecordsFailedChargeAndRetryWindow() public {
        vm.prank(MERCHANT);
        uint256 planId = protocol.createPlan(
            bytes32("USAGE_FLEX"),
            2_000e6,
            7 days,
            0,
            1 days,
            RenewProtocol.BillingMode.Metered,
            25e6
        );

        vm.prank(MERCHANT);
        uint256 subscriptionId = protocol.createSubscription(
            planId,
            bytes32("cust_usage"),
            bytes32("NGN"),
            uint64(block.timestamp),
            2_300e6
        );

        vm.prank(OPERATOR);
        uint256 chargeId = protocol.recordFailedCharge(
            subscriptionId,
            bytes32("charge_fail"),
            bytes32("PM_UPDATE")
        );

        RenewProtocol.Charge memory charge = protocol.getCharge(chargeId);
        RenewProtocol.Subscription memory subscription = protocol.getSubscription(subscriptionId);

        assert(charge.status == RenewProtocol.ChargeStatus.Failed);
        assert(charge.failureCode == bytes32("PM_UPDATE"));
        assert(subscription.retryAvailableAt == uint64(block.timestamp + 1 days));
    }
}
