// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {RenewProtocol} from "../src/RenewProtocol.sol";
import {RenewVault} from "../src/RenewVault.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

interface Vm {
    function prank(address caller) external;
    function warp(uint256 newTimestamp) external;
}

contract RenewProtocolTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    MockUSDC private token;
    RenewVault private vault;
    RenewProtocol private protocol;

    address private constant MERCHANT = address(0xA11CE);
    address private constant PAYOUT_WALLET = address(0xD00D);
    address private constant RESERVE_WALLET = address(0xBEEF);
    address private constant NEW_PAYOUT_WALLET = address(0xFEE1);
    address private constant SETTLEMENT_SOURCE = address(0xB0B);
    address private constant OPERATOR = address(0xCA11);

    function setUp() public {
        token = new MockUSDC();
        vault = new RenewVault(address(token), address(this));
        protocol = new RenewProtocol(address(token), address(vault), address(this), 250);
        vault.setProtocol(address(protocol));

        protocol.setChargeOperator(OPERATOR, true);
        token.mint(SETTLEMENT_SOURCE, 25_000_000e6);

        vm.prank(MERCHANT);
        protocol.registerMerchant(PAYOUT_WALLET, RESERVE_WALLET, bytes32("merchant"));
    }

    function testSchedulesFirstChargeUsingTrialOnly() public {
        vm.prank(MERCHANT);
        uint256 planId = protocol.createPlan(
            bytes32("TRIAL_PLAN"),
            5_000e6,
            30 days,
            14 days,
            2 days,
            3,
            RenewProtocol.BillingMode.Fixed,
            0
        );

        vm.prank(MERCHANT);
        uint256 subscriptionId = protocol.createSubscription(
            planId,
            bytes32("cust_trial"),
            bytes32("NGN"),
            0,
            5_400e6,
            bytes32("mandate_trial")
        );

        RenewProtocol.Subscription memory subscription = protocol.getSubscription(subscriptionId);

        assert(subscription.nextChargeAt == uint64(block.timestamp + 14 days));
        assert(subscription.usdPriceSnapshot == 5_000e6);
        assert(subscription.maxRetryCountSnapshot == 3);
    }

    function testExecutesFixedChargeAndCreditsVault() public {
        vm.prank(MERCHANT);
        uint256 planId = protocol.createPlan(
            bytes32("CORE_PLAN"),
            5_000e6,
            30 days,
            0,
            2 days,
            2,
            RenewProtocol.BillingMode.Fixed,
            0
        );

        vm.prank(MERCHANT);
        uint256 subscriptionId = protocol.createSubscription(
            planId,
            bytes32("cust_mazi"),
            bytes32("GHS"),
            uint64(block.timestamp),
            5_250e6,
            bytes32("mandate_core")
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
            0,
            5_000e6
        );

        RenewProtocol.Charge memory charge = protocol.getCharge(chargeId);
        RenewProtocol.Subscription memory subscription = protocol.getSubscription(subscriptionId);

        assert(charge.status == RenewProtocol.ChargeStatus.Executed);
        assert(charge.usdcAmount == 5_000e6);
        assert(charge.usageUnits == 0);
        assert(vault.merchantBalances(MERCHANT) == 4_875e6);
        assert(vault.protocolFeeBalance() == 125e6);
        assert(subscription.lastChargeAt == uint64(block.timestamp));
        assert(subscription.nextChargeAt == uint64(block.timestamp + 30 days));
        assert(subscription.retryCount == 0);
        assert(subscription.retryAvailableAt == 0);
    }

    function testCreditsOffchainSettlementIntoMerchantVault() public {
        vm.prank(SETTLEMENT_SOURCE);
        token.approve(address(protocol), 3_500e6);

        vm.prank(OPERATOR);
        uint256 chargeId = protocol.creditSettlement(
            MERCHANT,
            bytes32("settlement_1"),
            SETTLEMENT_SOURCE,
            3_500e6
        );

        RenewProtocol.Charge memory charge = protocol.getCharge(chargeId);

        assert(charge.subscriptionId == 0);
        assert(charge.merchant == MERCHANT);
        assert(charge.usdcAmount == 3_500e6);
        assert(vault.merchantBalances(MERCHANT) == 3_412_500_000);
        assert(vault.protocolFeeBalance() == 87_500_000);

        vm.prank(SETTLEMENT_SOURCE);
        token.approve(address(protocol), 3_500e6);

        vm.prank(OPERATOR);
        (bool success,) = address(protocol).call(
            abi.encodeWithSelector(
                RenewProtocol.creditSettlement.selector,
                MERCHANT,
                bytes32("settlement_1"),
                SETTLEMENT_SOURCE,
                uint128(3_500e6)
            )
        );

        assert(!success);
    }

    function testLateSettlementDoesNotShiftBillingCadence() public {
        vm.prank(MERCHANT);
        uint256 planId = protocol.createPlan(
            bytes32("CADENCE_PLAN"),
            4_000e6,
            30 days,
            0,
            1 days,
            2,
            RenewProtocol.BillingMode.Fixed,
            0
        );

        uint64 scheduledChargeAt = uint64(block.timestamp);

        vm.prank(MERCHANT);
        uint256 subscriptionId = protocol.createSubscription(
            planId,
            bytes32("cust_cadence"),
            bytes32("NGN"),
            scheduledChargeAt,
            4_200e6,
            bytes32("mandate_cadence")
        );

        vm.warp(block.timestamp + 3 days);

        vm.prank(SETTLEMENT_SOURCE);
        token.approve(address(protocol), 4_000e6);

        vm.prank(OPERATOR);
        protocol.executeCharge(
            subscriptionId,
            bytes32("charge_cadence"),
            SETTLEMENT_SOURCE,
            4_200e6,
            1_050_000,
            0,
            4_000e6
        );

        RenewProtocol.Subscription memory subscription = protocol.getSubscription(subscriptionId);

        assert(subscription.lastChargeAt == uint64(block.timestamp));
        assert(subscription.nextChargeAt == scheduledChargeAt + 30 days);
    }

    function testRejectsWrongMeteredChargeAmount() public {
        vm.prank(MERCHANT);
        uint256 planId = protocol.createPlan(
            bytes32("USAGE_FLEX"),
            2_000e6,
            7 days,
            0,
            1 days,
            2,
            RenewProtocol.BillingMode.Metered,
            25e6
        );

        vm.prank(MERCHANT);
        uint256 subscriptionId = protocol.createSubscription(
            planId,
            bytes32("cust_usage"),
            bytes32("NGN"),
            uint64(block.timestamp),
            2_300e6,
            bytes32("mandate_usage")
        );

        vm.prank(SETTLEMENT_SOURCE);
        token.approve(address(protocol), 3_000e6);

        vm.prank(OPERATOR);
        (bool success,) = address(protocol).call(
            abi.encodeWithSelector(
                RenewProtocol.executeCharge.selector,
                subscriptionId,
                bytes32("charge_wrong"),
                SETTLEMENT_SOURCE,
                2_300e6,
                1_150_000,
                uint128(12),
                uint128(2_100e6)
            )
        );

        assert(!success);

        vm.prank(OPERATOR);
        uint256 chargeId = protocol.executeCharge(
            subscriptionId,
            bytes32("charge_correct"),
            SETTLEMENT_SOURCE,
            2_300e6,
            1_150_000,
            12,
            2_300e6
        );

        RenewProtocol.Charge memory charge = protocol.getCharge(chargeId);
        assert(charge.usdcAmount == 2_300e6);
        assert(charge.usageUnits == 12);
    }

    function testRejectsDuplicateExternalChargeIdAcrossSameMerchant() public {
        vm.prank(MERCHANT);
        uint256 planId = protocol.createPlan(
            bytes32("DUP_PLAN"),
            1_000e6,
            30 days,
            0,
            1 days,
            1,
            RenewProtocol.BillingMode.Fixed,
            0
        );

        vm.prank(MERCHANT);
        uint256 firstSubscriptionId = protocol.createSubscription(
            planId,
            bytes32("cust_one"),
            bytes32("KES"),
            uint64(block.timestamp),
            1_050e6,
            bytes32("mandate_one")
        );

        vm.prank(MERCHANT);
        uint256 secondSubscriptionId = protocol.createSubscription(
            planId,
            bytes32("cust_two"),
            bytes32("KES"),
            uint64(block.timestamp),
            1_050e6,
            bytes32("mandate_two")
        );

        vm.prank(SETTLEMENT_SOURCE);
        token.approve(address(protocol), 2_000e6);

        vm.prank(OPERATOR);
        protocol.executeCharge(
            firstSubscriptionId,
            bytes32("dup_charge"),
            SETTLEMENT_SOURCE,
            1_050e6,
            1_050_000,
            0,
            1_000e6
        );

        vm.prank(OPERATOR);
        (bool success,) = address(protocol).call(
            abi.encodeWithSelector(
                RenewProtocol.executeCharge.selector,
                secondSubscriptionId,
                bytes32("dup_charge"),
                SETTLEMENT_SOURCE,
                uint128(1_050e6),
                uint128(1_050_000),
                uint128(0),
                uint128(1_000e6)
            )
        );

        assert(!success);
    }

    function testTracksRetryWindowAndStopsAfterRetryLimit() public {
        vm.prank(MERCHANT);
        uint256 planId = protocol.createPlan(
            bytes32("RETRY_PLAN"),
            2_000e6,
            7 days,
            0,
            1 days,
            2,
            RenewProtocol.BillingMode.Fixed,
            0
        );

        vm.prank(MERCHANT);
        uint256 subscriptionId = protocol.createSubscription(
            planId,
            bytes32("cust_retry"),
            bytes32("ZMW"),
            uint64(block.timestamp),
            2_100e6,
            bytes32("mandate_retry")
        );

        vm.prank(OPERATOR);
        protocol.recordFailedCharge(
            subscriptionId,
            bytes32("retry_1"),
            bytes32("PM_UPDATE")
        );

        RenewProtocol.Subscription memory subscription = protocol.getSubscription(subscriptionId);
        assert(subscription.retryCount == 1);
        assert(subscription.retryAvailableAt == uint64(block.timestamp + 1 days));

        vm.prank(OPERATOR);
        (bool earlyRetrySuccess,) = address(protocol).call(
            abi.encodeWithSelector(
                RenewProtocol.recordFailedCharge.selector,
                subscriptionId,
                bytes32("retry_2"),
                bytes32("PM_UPDATE")
            )
        );
        assert(!earlyRetrySuccess);

        vm.warp(block.timestamp + 1 days);

        vm.prank(OPERATOR);
        protocol.recordFailedCharge(
            subscriptionId,
            bytes32("retry_2"),
            bytes32("LOW_BAL")
        );

        subscription = protocol.getSubscription(subscriptionId);
        assert(subscription.retryCount == 2);

        vm.warp(block.timestamp + 1 days);

        vm.prank(OPERATOR);
        (bool overLimitSuccess,) = address(protocol).call(
            abi.encodeWithSelector(
                RenewProtocol.recordFailedCharge.selector,
                subscriptionId,
                bytes32("retry_3"),
                bytes32("LIMIT")
            )
        );
        assert(!overLimitSuccess);
    }

    function testTimelocksPayoutWalletChangeAndPromotesReserve() public {
        vm.prank(MERCHANT);
        protocol.requestMerchantPayoutWalletUpdate(NEW_PAYOUT_WALLET);

        RenewProtocol.Merchant memory merchant = protocol.getMerchant(MERCHANT);
        assert(merchant.pendingPayoutWallet == NEW_PAYOUT_WALLET);
        assert(merchant.payoutWalletChangeReadyAt == uint64(block.timestamp + 1 days));

        vm.prank(MERCHANT);
        (bool earlyConfirmSuccess,) = address(protocol).call(
            abi.encodeWithSelector(RenewProtocol.confirmMerchantPayoutWalletUpdate.selector)
        );
        assert(!earlyConfirmSuccess);

        vm.warp(block.timestamp + 1 days);

        vm.prank(MERCHANT);
        protocol.confirmMerchantPayoutWalletUpdate();

        merchant = protocol.getMerchant(MERCHANT);
        assert(merchant.payoutWallet == NEW_PAYOUT_WALLET);
        assert(merchant.pendingPayoutWallet == address(0));

        vm.prank(MERCHANT);
        protocol.promoteReserveWallet();

        merchant = protocol.getMerchant(MERCHANT);
        assert(merchant.payoutWallet == RESERVE_WALLET);
        assert(merchant.reserveWallet == NEW_PAYOUT_WALLET);

        vm.prank(MERCHANT);
        protocol.clearReserveWallet();

        merchant = protocol.getMerchant(MERCHANT);
        assert(merchant.reserveWallet == address(0));
    }
}
