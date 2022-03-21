// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { BidInfo } from "../FukuTypes.sol";

struct BidMarketStorage {
    uint256 nextBidId;
    mapping(uint256 => BidInfo) bids;
}

struct VaultStorage {
    mapping(bytes12 => address) vaultAddresses;
    mapping(address => mapping(bytes12 => uint256)) userVaultBalances;
}

struct PunkTokenStorage {
    address punkToken;
}

library LibStorage {
    bytes32 constant BID_MARKET_STORAGE_POSITION = keccak256("fuku.storage.market.bid");
    bytes32 constant VAULT_STORAGE_POSITION = keccak256("fuku.storage.vault");
    bytes32 constant PUNK_TOKEN_STORAGE_POSITION = keccak256("fuku.storage.punk.token");

    function bidMarketStorage() internal pure returns (BidMarketStorage storage bms) {
        bytes32 position = BID_MARKET_STORAGE_POSITION;
        assembly {
            bms.slot := position
        }
    }

    function vaultStorage() internal pure returns (VaultStorage storage vs) {
        bytes32 position = VAULT_STORAGE_POSITION;
        assembly {
            vs.slot := position
        }
    }

    function punkTokenStorage() internal pure returns (PunkTokenStorage storage pts) {
        bytes32 position = PUNK_TOKEN_STORAGE_POSITION;
        assembly {
            pts.slot := position
        }
    }
}
