// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { BidInfo, OptionInfo, AcceptedOption } from "../FukuTypes.sol";

struct BidMarketStorage {
    uint256 nextBidId;
    mapping(uint256 => BidInfo) bids;
}

struct OptionMarketStorage {
    uint256 nextOptionId;
    mapping(uint256 => OptionInfo) options;
    mapping(uint256 => AcceptedOption) acceptedOptions;
}

struct VaultStorage {
    mapping(bytes12 => address) vaultAddresses;
    mapping(address => mapping(bytes12 => uint256)) userVaultBalances;
}

struct PunkTokenStorage {
    address punkToken;
}

struct AirdropClaimStorage {
    bytes32 merkleRoot;
    address token;
    uint256 totalAmount; // todo: unused
    uint256 initialUnlockBps; // todo: unused
    mapping(address => uint256) claimed;
}

struct RewardsClaimStorage {
    mapping(address => uint256) rewards;
}

struct RewardsManagementStorage {
    uint256 nextEpochId;
    uint256 epochDuration;
    mapping(uint256 => uint256) epochEndings;
    mapping(uint256 => uint256) depositsAllocation;
    mapping(uint256 => uint256) salesAllocation;
    mapping(uint256 => mapping(address => uint256)) collectionAllocation;
}

struct BidRewardsStorage {
    mapping(uint256 => mapping(address => uint256)) floorPrices;
    mapping(uint256 => mapping(address => uint256)) competitiveBids;
}

struct DepositsRewardsStorage {
    mapping(uint256 => mapping(address => uint256)) deposits;
}

struct SalesRewardsStorage {
    mapping(uint256 => mapping(address => uint256)) sales;
}

library LibStorage {
    bytes32 constant BID_MARKET_STORAGE_POSITION = keccak256("fuku.storage.market.bid");
    bytes32 constant OPTION_MARKET_STORAGE_POSTION = keccak256("fuku.storage.market.option");
    bytes32 constant VAULT_STORAGE_POSITION = keccak256("fuku.storage.vault");
    bytes32 constant PUNK_TOKEN_STORAGE_POSITION = keccak256("fuku.storage.punk.token");
    bytes32 constant AIRDROP_CLAIM_STORAGE_POSITION = keccak256("fuku.storage.airdrop.claim");
    bytes32 constant REWARDS_CLAIM_STORAGE_POSITION = keccak256("fuku.storage.rewards.claim");
    bytes32 constant REWARDS_MANAGEMENT_STORAGE_POSITION = keccak256("fuku.storage.rewards.management");
    bytes32 constant BIDS_REWARDS_STORAGE_POSITION = keccak256("fuku.storage.bids.rewards");
    bytes32 constant DEPOSITS_REWARDS_STORAGE_POSITION = keccak256("fuku.storage.deposits.rewards");
    bytes32 constant SALES_REWARDS_STORAGE_POSITION = keccak256("fuku.storage.sales.rewards");

    function bidMarketStorage() internal pure returns (BidMarketStorage storage bms) {
        bytes32 position = BID_MARKET_STORAGE_POSITION;
        assembly {
            bms.slot := position
        }
    }

    function optionMarketStorage() internal pure returns (OptionMarketStorage storage oms) {
        bytes32 position = OPTION_MARKET_STORAGE_POSTION;
        assembly {
            oms.slot := position
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

    function airdropClaimStorage() internal pure returns (AirdropClaimStorage storage acs) {
        bytes32 position = AIRDROP_CLAIM_STORAGE_POSITION;
        assembly {
            acs.slot := position
        }
    }

    function rewardsClaimStorage() internal pure returns (RewardsClaimStorage storage rcs) {
        bytes32 position = REWARDS_CLAIM_STORAGE_POSITION;
        assembly {
            rcs.slot := position
        }
    }

    function rewardsManagementStorage() internal pure returns (RewardsManagementStorage storage rms) {
        bytes32 position = REWARDS_MANAGEMENT_STORAGE_POSITION;
        assembly {
            rms.slot := position
        }
    }

    function bidRewardsStorage() internal pure returns (BidRewardsStorage storage brs) {
        bytes32 position = BIDS_REWARDS_STORAGE_POSITION;
        assembly {
            brs.slot := position
        }
    }

    function depositsRewardsStorage() internal pure returns (DepositsRewardsStorage storage drs) {
        bytes32 position = DEPOSITS_REWARDS_STORAGE_POSITION;
        assembly {
            drs.slot := position
        }
    }

    function salesRewardsStorage() internal pure returns (SalesRewardsStorage storage srs) {
        bytes32 position = SALES_REWARDS_STORAGE_POSITION;
        assembly {
            srs.slot := position
        }
    }
}
