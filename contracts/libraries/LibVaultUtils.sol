// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { LibStorage, VaultStorage } from "./LibStorage.sol";
import { IVault } from "../interfaces/IVault.sol";

library LibVaultUtils {
    function getUserLpTokenBalance(address user, bytes12 vaultName) internal view returns (uint256) {
        VaultStorage storage vs = LibStorage.vaultStorage();

        return vs.userVaultBalances[user][vaultName];
    }

    function getUserEthBalance(address user, bytes12 vaultName) internal view returns (uint256) {
        VaultStorage storage vs = LibStorage.vaultStorage();

        return IVault(vs.vaultAddresses[vaultName]).convertSharesToEth(vs.userVaultBalances[user][vaultName]);
    }
}
