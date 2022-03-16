// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

struct VaultStorage {
    bytes12[] vaultNames;
    mapping(bytes12 => address) vaultAddresses;
    mapping(address => mapping(bytes12 => uint256)) userVaultBalances;
}

library LibStorage {
    bytes32 constant VAULT_STORAGE_POSITION = keccak256("fuku.storage.vault");

    function vaultStorage() internal pure returns (VaultStorage storage vs) {
        bytes32 position = VAULT_STORAGE_POSITION;
        assembly {
            vs.slot := position
        }
    }
}
