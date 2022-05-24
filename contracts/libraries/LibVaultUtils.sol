// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { LibStorage, VaultStorage } from "./LibStorage.sol";
import { IVault } from "../interfaces/vaults/IVault.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

library LibVaultUtils {
    function getUserLpTokenBalance(address user, bytes12 vaultName) internal view returns (uint256) {
        VaultStorage storage vs = LibStorage.vaultStorage();

        return vs.userVaultBalances[user][vaultName];
    }

    function getUserEthBalance(address user, bytes12 vaultName) internal view returns (uint256) {
        VaultStorage storage vs = LibStorage.vaultStorage();

        return IVault(vs.vaultAddresses[vaultName]).getAmountETH(vs.userVaultBalances[user][vaultName]);
    }

    function getTotalVaultHoldings(bytes12 vaultName) internal view returns (uint256) {
        VaultStorage storage vs = LibStorage.vaultStorage();

        address vault = vs.vaultAddresses[vaultName];
        address vaultLpToken = IVault(vault).getLpToken();
        if (vaultLpToken == address(0)) {
            return vault.balance;
        } else {
            return IERC20(vaultLpToken).balanceOf(vault);
        }
    }

    function getVaultOptionalData(bytes12 vaultName) internal view returns (bytes memory optionalData) {
        // todo: find alternative solution instead of hardcoding
        bytes12 rocket_vault_name = 0xeeeeeeeeeeeeeeeeeeeeeeed;

        if (vaultName == rocket_vault_name) {
            optionalData = abi.encode(msg.sender);
        }
    }
}
