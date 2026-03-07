// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";
import {IRenewVault} from "./interfaces/IRenewVault.sol";

contract RenewProtocol {
    enum BillingMode {
        Fixed,
        Metered
    }

    enum SubscriptionStatus {
        Inactive,
        Active,
        Paused,
        Cancelled
    }

    enum ChargeStatus {
        Unset,
        Executed,
        Failed
    }

    struct Merchant {
        address payoutWallet;
        address reserveWallet;
        address pendingPayoutWallet;
        bytes32 metadataHash;
        bool active;
        uint64 payoutWalletChangeReadyAt;
        uint64 createdAt;
    }

    struct Plan {
        address merchant;
        bytes32 planCode;
        uint128 usdPrice;
        uint128 usageRate;
        uint64 billingInterval;
        uint32 trialPeriod;
        uint32 retryWindow;
        uint8 maxRetryCount;
        BillingMode billingMode;
        bool active;
        uint64 createdAt;
    }

    struct Subscription {
        address merchant;
        uint256 planId;
        bytes32 customerRef;
        bytes32 billingCurrency;
        bytes32 mandateHash;
        SubscriptionStatus status;
        BillingMode billingMode;
        uint128 usdPriceSnapshot;
        uint128 usageRateSnapshot;
        uint128 localAmountSnapshot;
        uint64 billingIntervalSnapshot;
        uint32 retryWindowSnapshot;
        uint8 maxRetryCountSnapshot;
        uint8 retryCount;
        uint64 nextChargeAt;
        uint64 lastChargeAt;
        uint64 retryAvailableAt;
        uint64 createdAt;
    }

    struct Charge {
        uint256 subscriptionId;
        address merchant;
        address settlementSource;
        bytes32 externalChargeId;
        bytes32 failureCode;
        uint128 localAmount;
        uint128 fxRate;
        uint128 usdcAmount;
        uint128 feeAmount;
        uint128 usageUnits;
        uint64 billingPeriodAt;
        uint64 processedAt;
        ChargeStatus status;
    }

    error InvalidAddress();
    error InvalidAmount();
    error InvalidInput();
    error InvalidChargeAmount();
    error NotOwner();
    error NotChargeOperator();
    error MerchantAlreadyRegistered();
    error MerchantNotRegistered();
    error MerchantInactive();
    error PlanNotFound();
    error SubscriptionNotFound();
    error PlanOwnershipMismatch();
    error SubscriptionOwnershipMismatch();
    error SubscriptionNotChargeable();
    error DuplicateExternalChargeId();
    error ChargeAlreadySettledForCycle();
    error RetryLimitReached();
    error NoPendingPayoutWallet();
    error WalletChangeNotReady();
    error NoReserveWallet();
    error TransferFailed();

    event ChargeOperatorUpdated(address indexed operator, bool enabled);
    event MerchantRegistered(
        address indexed merchant,
        address indexed payoutWallet,
        address indexed reserveWallet,
        bytes32 metadataHash
    );
    event MerchantStatusUpdated(address indexed merchant, bool active);
    event MerchantReserveWalletUpdated(address indexed merchant, address indexed reserveWallet);
    event MerchantPayoutWalletChangeRequested(
        address indexed merchant,
        address indexed pendingPayoutWallet,
        uint64 readyAt
    );
    event MerchantPayoutWalletUpdated(address indexed merchant, address indexed payoutWallet);
    event MerchantReserveWalletPromoted(address indexed merchant, address indexed payoutWallet);
    event PlanCreated(
        uint256 indexed planId,
        address indexed merchant,
        bytes32 indexed planCode,
        uint128 usdPrice,
        uint64 billingInterval,
        BillingMode billingMode
    );
    event PlanUpdated(uint256 indexed planId);
    event SubscriptionCreated(
        uint256 indexed subscriptionId,
        address indexed merchant,
        uint256 indexed planId,
        bytes32 customerRef,
        uint64 nextChargeAt,
        bytes32 mandateHash
    );
    event SubscriptionStatusUpdated(uint256 indexed subscriptionId, SubscriptionStatus status);
    event SubscriptionMandateUpdated(uint256 indexed subscriptionId, bytes32 mandateHash);
    event ChargeExecuted(
        uint256 indexed chargeId,
        uint256 indexed subscriptionId,
        address indexed merchant,
        bytes32 externalChargeId,
        uint128 usdcAmount,
        uint128 feeAmount,
        uint128 usageUnits,
        uint64 billingPeriodAt,
        uint64 nextChargeAt
    );
    event ChargeFailed(
        uint256 indexed chargeId,
        uint256 indexed subscriptionId,
        address indexed merchant,
        bytes32 externalChargeId,
        bytes32 failureCode,
        uint8 retryCount,
        uint64 retryAvailableAt
    );
    event MerchantWithdrawal(address indexed merchant, address indexed to, uint256 amount);
    event ProtocolFeesWithdrawn(address indexed to, uint256 amount);
    event ProtocolFeeUpdated(uint16 feeBps);
    event FeeCollectorUpdated(address indexed feeCollector);

    uint16 public constant MAX_PROTOCOL_FEE_BPS = 2_500;
    uint64 public constant PAYOUT_WALLET_CHANGE_DELAY = 1 days;

    address public immutable owner;
    IERC20 public immutable settlementAsset;
    IRenewVault public immutable vault;

    address public feeCollector;
    uint16 public protocolFeeBps;

    uint256 public nextPlanId = 1;
    uint256 public nextSubscriptionId = 1;
    uint256 public nextChargeId = 1;

    mapping(address => Merchant) private merchants;
    mapping(address => bool) private merchantExists;
    mapping(address => bool) public chargeOperators;

    mapping(uint256 => Plan) private plans;
    mapping(uint256 => Subscription) private subscriptions;
    mapping(uint256 => Charge) private charges;
    mapping(address => mapping(bytes32 => bool)) public merchantExternalChargeIds;
    mapping(uint256 => mapping(uint64 => bool)) public settledChargeCycles;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyChargeOperator() {
        if (!chargeOperators[msg.sender]) revert NotChargeOperator();
        _;
    }

    modifier onlyRegisteredMerchant() {
        if (!merchantExists[msg.sender]) revert MerchantNotRegistered();
        if (!merchants[msg.sender].active) revert MerchantInactive();
        _;
    }

    constructor(
        address settlementAsset_,
        address vault_,
        address feeCollector_,
        uint16 protocolFeeBps_
    ) {
        if (settlementAsset_ == address(0) || vault_ == address(0) || feeCollector_ == address(0)) {
            revert InvalidAddress();
        }
        if (protocolFeeBps_ > MAX_PROTOCOL_FEE_BPS) revert InvalidInput();

        owner = msg.sender;
        settlementAsset = IERC20(settlementAsset_);
        vault = IRenewVault(vault_);
        feeCollector = feeCollector_;
        protocolFeeBps = protocolFeeBps_;
    }

    function setChargeOperator(address operator, bool enabled) external onlyOwner {
        if (operator == address(0)) revert InvalidAddress();

        chargeOperators[operator] = enabled;

        emit ChargeOperatorUpdated(operator, enabled);
    }

    function updateProtocolFee(uint16 feeBps) external onlyOwner {
        if (feeBps > MAX_PROTOCOL_FEE_BPS) revert InvalidInput();

        protocolFeeBps = feeBps;

        emit ProtocolFeeUpdated(feeBps);
    }

    function updateFeeCollector(address feeCollector_) external onlyOwner {
        if (feeCollector_ == address(0)) revert InvalidAddress();

        feeCollector = feeCollector_;

        emit FeeCollectorUpdated(feeCollector_);
    }

    function registerMerchant(
        address payoutWallet,
        address reserveWallet,
        bytes32 metadataHash
    ) external {
        if (merchantExists[msg.sender]) revert MerchantAlreadyRegistered();
        if (payoutWallet == address(0) || reserveWallet == address(0)) revert InvalidAddress();

        merchantExists[msg.sender] = true;
        merchants[msg.sender] = Merchant({
            payoutWallet: payoutWallet,
            reserveWallet: reserveWallet,
            pendingPayoutWallet: address(0),
            metadataHash: metadataHash,
            active: true,
            payoutWalletChangeReadyAt: 0,
            createdAt: uint64(block.timestamp)
        });

        emit MerchantRegistered(msg.sender, payoutWallet, reserveWallet, metadataHash);
    }

    function updateReserveWallet(address reserveWallet) external onlyRegisteredMerchant {
        if (reserveWallet == address(0)) revert InvalidAddress();

        merchants[msg.sender].reserveWallet = reserveWallet;

        emit MerchantReserveWalletUpdated(msg.sender, reserveWallet);
    }

    function clearReserveWallet() external onlyRegisteredMerchant {
        merchants[msg.sender].reserveWallet = address(0);

        emit MerchantReserveWalletUpdated(msg.sender, address(0));
    }

    function requestMerchantPayoutWalletUpdate(address payoutWallet) external onlyRegisteredMerchant {
        if (payoutWallet == address(0)) revert InvalidAddress();

        Merchant storage merchant = merchants[msg.sender];
        merchant.pendingPayoutWallet = payoutWallet;
        merchant.payoutWalletChangeReadyAt = uint64(block.timestamp) + PAYOUT_WALLET_CHANGE_DELAY;

        emit MerchantPayoutWalletChangeRequested(
            msg.sender,
            payoutWallet,
            merchant.payoutWalletChangeReadyAt
        );
    }

    function confirmMerchantPayoutWalletUpdate() external onlyRegisteredMerchant {
        Merchant storage merchant = merchants[msg.sender];

        if (merchant.pendingPayoutWallet == address(0)) revert NoPendingPayoutWallet();
        if (merchant.payoutWalletChangeReadyAt > block.timestamp) revert WalletChangeNotReady();

        merchant.payoutWallet = merchant.pendingPayoutWallet;
        merchant.pendingPayoutWallet = address(0);
        merchant.payoutWalletChangeReadyAt = 0;

        emit MerchantPayoutWalletUpdated(msg.sender, merchant.payoutWallet);
    }

    function promoteReserveWallet() external onlyRegisteredMerchant {
        Merchant storage merchant = merchants[msg.sender];

        if (merchant.reserveWallet == address(0)) revert NoReserveWallet();

        address previousPayoutWallet = merchant.payoutWallet;

        merchant.payoutWallet = merchant.reserveWallet;
        merchant.reserveWallet = previousPayoutWallet;
        merchant.pendingPayoutWallet = address(0);
        merchant.payoutWalletChangeReadyAt = 0;

        emit MerchantReserveWalletPromoted(msg.sender, merchant.payoutWallet);
        emit MerchantReserveWalletUpdated(msg.sender, merchant.reserveWallet);
    }

    function setMerchantStatus(address merchant, bool active) external onlyOwner {
        if (!merchantExists[merchant]) revert MerchantNotRegistered();

        merchants[merchant].active = active;

        emit MerchantStatusUpdated(merchant, active);
    }

    function createPlan(
        bytes32 planCode,
        uint128 usdPrice,
        uint64 billingInterval,
        uint32 trialPeriod,
        uint32 retryWindow,
        uint8 maxRetryCount,
        BillingMode billingMode,
        uint128 usageRate
    ) external onlyRegisteredMerchant returns (uint256 planId) {
        if (planCode == bytes32(0)) revert InvalidInput();
        if (billingInterval == 0) revert InvalidAmount();

        _validatePlanAmounts(billingMode, usdPrice, usageRate);

        planId = nextPlanId++;
        plans[planId] = Plan({
            merchant: msg.sender,
            planCode: planCode,
            usdPrice: usdPrice,
            usageRate: usageRate,
            billingInterval: billingInterval,
            trialPeriod: trialPeriod,
            retryWindow: retryWindow,
            maxRetryCount: maxRetryCount,
            billingMode: billingMode,
            active: true,
            createdAt: uint64(block.timestamp)
        });

        emit PlanCreated(planId, msg.sender, planCode, usdPrice, billingInterval, billingMode);
    }

    function updatePlan(
        uint256 planId,
        uint128 usdPrice,
        uint64 billingInterval,
        uint32 trialPeriod,
        uint32 retryWindow,
        uint8 maxRetryCount,
        BillingMode billingMode,
        uint128 usageRate,
        bool active
    ) external onlyRegisteredMerchant {
        Plan storage plan = plans[planId];

        if (plan.merchant == address(0)) revert PlanNotFound();
        if (plan.merchant != msg.sender) revert PlanOwnershipMismatch();
        if (billingInterval == 0) revert InvalidAmount();

        _validatePlanAmounts(billingMode, usdPrice, usageRate);

        plan.usdPrice = usdPrice;
        plan.billingInterval = billingInterval;
        plan.trialPeriod = trialPeriod;
        plan.retryWindow = retryWindow;
        plan.maxRetryCount = maxRetryCount;
        plan.billingMode = billingMode;
        plan.usageRate = usageRate;
        plan.active = active;

        emit PlanUpdated(planId);
    }

    function createSubscription(
        uint256 planId,
        bytes32 customerRef,
        bytes32 billingCurrency,
        uint64 firstChargeAt,
        uint128 localAmountSnapshot,
        bytes32 mandateHash
    ) external onlyRegisteredMerchant returns (uint256 subscriptionId) {
        Plan storage plan = plans[planId];

        if (plan.merchant == address(0)) revert PlanNotFound();
        if (plan.merchant != msg.sender) revert PlanOwnershipMismatch();
        if (!plan.active) revert InvalidInput();
        if (customerRef == bytes32(0) || billingCurrency == bytes32(0) || mandateHash == bytes32(0)) {
            revert InvalidInput();
        }
        if (firstChargeAt != 0 && firstChargeAt < block.timestamp) revert InvalidInput();

        uint64 scheduleStart = firstChargeAt == 0
            ? uint64(block.timestamp) + plan.trialPeriod
            : firstChargeAt;

        subscriptionId = nextSubscriptionId++;
        subscriptions[subscriptionId] = Subscription({
            merchant: msg.sender,
            planId: planId,
            customerRef: customerRef,
            billingCurrency: billingCurrency,
            mandateHash: mandateHash,
            status: SubscriptionStatus.Active,
            billingMode: plan.billingMode,
            usdPriceSnapshot: plan.usdPrice,
            usageRateSnapshot: plan.usageRate,
            localAmountSnapshot: localAmountSnapshot,
            billingIntervalSnapshot: plan.billingInterval,
            retryWindowSnapshot: plan.retryWindow,
            maxRetryCountSnapshot: plan.maxRetryCount,
            retryCount: 0,
            nextChargeAt: scheduleStart,
            lastChargeAt: 0,
            retryAvailableAt: 0,
            createdAt: uint64(block.timestamp)
        });

        emit SubscriptionCreated(
            subscriptionId,
            msg.sender,
            planId,
            customerRef,
            scheduleStart,
            mandateHash
        );
    }

    function updateSubscriptionMandateHash(
        uint256 subscriptionId,
        bytes32 mandateHash
    ) external onlyRegisteredMerchant {
        if (mandateHash == bytes32(0)) revert InvalidInput();

        Subscription storage subscription = _getMerchantSubscription(subscriptionId, msg.sender);
        subscription.mandateHash = mandateHash;

        emit SubscriptionMandateUpdated(subscriptionId, mandateHash);
    }

    function pauseSubscription(uint256 subscriptionId) external onlyRegisteredMerchant {
        _setSubscriptionStatus(subscriptionId, SubscriptionStatus.Paused);
    }

    function resumeSubscription(uint256 subscriptionId, uint64 nextChargeAt) external onlyRegisteredMerchant {
        Subscription storage subscription = _getMerchantSubscription(subscriptionId, msg.sender);

        if (subscription.status == SubscriptionStatus.Cancelled) revert InvalidInput();

        subscription.status = SubscriptionStatus.Active;
        subscription.nextChargeAt = nextChargeAt == 0 ? uint64(block.timestamp) : nextChargeAt;
        subscription.retryAvailableAt = 0;
        subscription.retryCount = 0;

        emit SubscriptionStatusUpdated(subscriptionId, SubscriptionStatus.Active);
    }

    function cancelSubscription(uint256 subscriptionId) external onlyRegisteredMerchant {
        _setSubscriptionStatus(subscriptionId, SubscriptionStatus.Cancelled);
    }

    function executeCharge(
        uint256 subscriptionId,
        bytes32 externalChargeId,
        address settlementSource,
        uint128 localAmount,
        uint128 fxRate,
        uint128 usageUnits,
        uint128 usdcAmount
    ) external onlyChargeOperator returns (uint256 chargeId) {
        Subscription storage subscription = subscriptions[subscriptionId];

        if (subscription.merchant == address(0)) revert SubscriptionNotFound();
        if (!merchants[subscription.merchant].active) revert MerchantInactive();
        if (settlementSource == address(0)) revert InvalidAddress();
        if (externalChargeId == bytes32(0) || localAmount == 0 || fxRate == 0 || usdcAmount == 0) {
            revert InvalidInput();
        }
        if (merchantExternalChargeIds[subscription.merchant][externalChargeId]) {
            revert DuplicateExternalChargeId();
        }

        uint64 billingPeriodAt = _assertChargeable(subscription);

        if (settledChargeCycles[subscriptionId][billingPeriodAt]) {
            revert ChargeAlreadySettledForCycle();
        }

        uint128 expectedUsdcAmount = _expectedUsdcAmount(subscription, usageUnits);
        if (usdcAmount != expectedUsdcAmount) revert InvalidChargeAmount();

        if (!settlementAsset.transferFrom(settlementSource, address(vault), usdcAmount)) {
            revert TransferFailed();
        }

        uint128 feeAmount = uint128((uint256(usdcAmount) * protocolFeeBps) / 10_000);
        vault.creditMerchantBalance(subscription.merchant, usdcAmount, feeAmount);

        merchantExternalChargeIds[subscription.merchant][externalChargeId] = true;
        settledChargeCycles[subscriptionId][billingPeriodAt] = true;

        subscription.lastChargeAt = uint64(block.timestamp);
        // Keep cadence anchored to the scheduled billing period instead of drifting on late settlement.
        subscription.nextChargeAt = billingPeriodAt + subscription.billingIntervalSnapshot;
        subscription.retryAvailableAt = 0;
        subscription.retryCount = 0;

        chargeId = nextChargeId++;
        charges[chargeId] = Charge({
            subscriptionId: subscriptionId,
            merchant: subscription.merchant,
            settlementSource: settlementSource,
            externalChargeId: externalChargeId,
            failureCode: bytes32(0),
            localAmount: localAmount,
            fxRate: fxRate,
            usdcAmount: usdcAmount,
            feeAmount: feeAmount,
            usageUnits: usageUnits,
            billingPeriodAt: billingPeriodAt,
            processedAt: uint64(block.timestamp),
            status: ChargeStatus.Executed
        });

        emit ChargeExecuted(
            chargeId,
            subscriptionId,
            subscription.merchant,
            externalChargeId,
            usdcAmount,
            feeAmount,
            usageUnits,
            billingPeriodAt,
            subscription.nextChargeAt
        );
    }

    function recordFailedCharge(
        uint256 subscriptionId,
        bytes32 externalChargeId,
        bytes32 failureCode
    ) external onlyChargeOperator returns (uint256 chargeId) {
        Subscription storage subscription = subscriptions[subscriptionId];

        if (subscription.merchant == address(0)) revert SubscriptionNotFound();
        if (!merchants[subscription.merchant].active) revert MerchantInactive();
        if (externalChargeId == bytes32(0) || failureCode == bytes32(0)) revert InvalidInput();
        if (merchantExternalChargeIds[subscription.merchant][externalChargeId]) {
            revert DuplicateExternalChargeId();
        }

        uint64 billingPeriodAt = _assertChargeable(subscription);

        if (settledChargeCycles[subscriptionId][billingPeriodAt]) {
            revert ChargeAlreadySettledForCycle();
        }
        if (subscription.retryCount >= subscription.maxRetryCountSnapshot) {
            revert RetryLimitReached();
        }

        subscription.retryCount += 1;
        subscription.retryAvailableAt = subscription.retryWindowSnapshot == 0
            ? uint64(block.timestamp)
            : uint64(block.timestamp) + subscription.retryWindowSnapshot;
        merchantExternalChargeIds[subscription.merchant][externalChargeId] = true;

        chargeId = nextChargeId++;
        charges[chargeId] = Charge({
            subscriptionId: subscriptionId,
            merchant: subscription.merchant,
            settlementSource: address(0),
            externalChargeId: externalChargeId,
            failureCode: failureCode,
            localAmount: subscription.localAmountSnapshot,
            fxRate: 0,
            usdcAmount: 0,
            feeAmount: 0,
            usageUnits: 0,
            billingPeriodAt: billingPeriodAt,
            processedAt: uint64(block.timestamp),
            status: ChargeStatus.Failed
        });

        emit ChargeFailed(
            chargeId,
            subscriptionId,
            subscription.merchant,
            externalChargeId,
            failureCode,
            subscription.retryCount,
            subscription.retryAvailableAt
        );
    }

    function withdraw(uint256 amount) external onlyRegisteredMerchant {
        address payoutWallet = merchants[msg.sender].payoutWallet;
        vault.withdrawMerchantBalance(msg.sender, payoutWallet, amount);

        emit MerchantWithdrawal(msg.sender, payoutWallet, amount);
    }

    function withdrawProtocolFees(uint256 amount) external onlyOwner {
        vault.withdrawProtocolFees(feeCollector, amount);

        emit ProtocolFeesWithdrawn(feeCollector, amount);
    }

    function getMerchant(address merchant) external view returns (Merchant memory) {
        if (!merchantExists[merchant]) revert MerchantNotRegistered();
        return merchants[merchant];
    }

    function getPlan(uint256 planId) external view returns (Plan memory) {
        Plan memory plan = plans[planId];
        if (plan.merchant == address(0)) revert PlanNotFound();
        return plan;
    }

    function getSubscription(uint256 subscriptionId) external view returns (Subscription memory) {
        Subscription memory subscription = subscriptions[subscriptionId];
        if (subscription.merchant == address(0)) revert SubscriptionNotFound();
        return subscription;
    }

    function getCharge(uint256 chargeId) external view returns (Charge memory) {
        Charge memory charge = charges[chargeId];
        if (charge.status == ChargeStatus.Unset) revert InvalidInput();
        return charge;
    }

    function _setSubscriptionStatus(uint256 subscriptionId, SubscriptionStatus status) private {
        Subscription storage subscription = _getMerchantSubscription(subscriptionId, msg.sender);

        subscription.status = status;
        if (status != SubscriptionStatus.Active) {
            subscription.retryAvailableAt = 0;
            subscription.retryCount = 0;
        }

        emit SubscriptionStatusUpdated(subscriptionId, status);
    }

    function _getMerchantSubscription(
        uint256 subscriptionId,
        address merchant
    ) private view returns (Subscription storage subscription) {
        subscription = subscriptions[subscriptionId];

        if (subscription.merchant == address(0)) revert SubscriptionNotFound();
        if (subscription.merchant != merchant) revert SubscriptionOwnershipMismatch();
    }

    function _validatePlanAmounts(
        BillingMode billingMode,
        uint128 usdPrice,
        uint128 usageRate
    ) private pure {
        if (billingMode == BillingMode.Fixed) {
            if (usdPrice == 0) revert InvalidAmount();
            return;
        }

        if (usdPrice == 0 && usageRate == 0) revert InvalidAmount();
    }

    function _assertChargeable(Subscription storage subscription) private view returns (uint64 billingPeriodAt) {
        if (subscription.status != SubscriptionStatus.Active) revert SubscriptionNotChargeable();

        billingPeriodAt = subscription.nextChargeAt;

        if (subscription.retryCount == 0) {
            if (billingPeriodAt > block.timestamp) revert SubscriptionNotChargeable();
            return billingPeriodAt;
        }

        if (subscription.retryAvailableAt == 0 || subscription.retryAvailableAt > block.timestamp) {
            revert SubscriptionNotChargeable();
        }
    }

    function _expectedUsdcAmount(
        Subscription storage subscription,
        uint128 usageUnits
    ) private view returns (uint128 expectedUsdcAmount) {
        if (subscription.billingMode == BillingMode.Fixed) {
            if (usageUnits != 0) revert InvalidChargeAmount();
            return subscription.usdPriceSnapshot;
        }

        if (usageUnits == 0) revert InvalidChargeAmount();

        // Metered plans settle base price plus the usage units reported for the current cycle.
        uint256 total = uint256(subscription.usdPriceSnapshot) +
            (uint256(subscription.usageRateSnapshot) * uint256(usageUnits));

        if (total > type(uint128).max) revert InvalidChargeAmount();

        return uint128(total);
    }
}
