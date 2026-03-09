// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {RenewProtocol} from "../src/RenewProtocol.sol";
import {RenewVault} from "../src/RenewVault.sol";

interface Vm {
    function envUint(string calldata key) external returns (uint256);
    function envAddress(string calldata key) external returns (address);
    function envOr(string calldata key, address defaultValue) external returns (address);
    function envOr(string calldata key, uint256 defaultValue) external returns (uint256);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract DeployRenewProtocolScript {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (RenewVault vault, RenewProtocol protocol) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address settlementAsset = vm.envAddress("SETTLEMENT_ASSET_ADDRESS");
        address deployerAddress = vm.envAddress("DEPLOYER_ADDRESS");
        address feeCollector = vm.envOr("FEE_COLLECTOR_ADDRESS", deployerAddress);
        address chargeOperator = vm.envOr("CHARGE_OPERATOR_ADDRESS", deployerAddress);
        uint256 protocolFeeBps = vm.envOr("PROTOCOL_FEE_BPS", uint256(250));

        vm.startBroadcast(deployerPrivateKey);

        vault = new RenewVault(settlementAsset, deployerAddress);
        protocol = new RenewProtocol(
            settlementAsset,
            address(vault),
            feeCollector,
            uint16(protocolFeeBps)
        );
        vault.setProtocol(address(protocol));
        protocol.setChargeOperator(chargeOperator, true);

        vm.stopBroadcast();
    }
}
