// SPDX-License-Identifier: MIT
/**
 * Vendored on March 15, 2022 from:
 * https://github.com/mudgen/diamond-3-hardhat/blob/main/contracts/upgradeInitializers/DiamondInit.sol
 */
pragma solidity ^0.8.0;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
*
* Implementation of a diamond.
/******************************************************************************/

import { LibDiamond } from "./vendor/libraries/LibDiamond.sol";
import { IDiamondLoupe } from "./vendor/interfaces/IDiamondLoupe.sol";
import { IDiamondCut } from "./vendor/interfaces/IDiamondCut.sol";
import { IERC173 } from "./vendor/interfaces/IERC173.sol";
import { IERC165 } from "./vendor/interfaces/IERC165.sol";
import { LibStorage, PunkTokenStorage } from "./libraries/LibStorage.sol";
import { IVaultAccounting } from "./interfaces/facets/IVaultAccounting.sol";
import { IVaultManagement } from "./interfaces/facets/IVaultManagement.sol";
import { IBidMarket } from "./interfaces/facets/IBidMarket.sol";
import { IOptionMarket } from "./interfaces/facets/IOptionMarket.sol";

// It is expected that this contract is customized if you want to deploy your diamond
// with data from a deployment script. Use the init function to initialize state variables
// of your diamond. Add parameters to the init funciton if you need to.

contract FukuInit {
    // You can add parameters to this function in order to pass in
    // data to set your own state variables
    function init(address cryptoPunks) external {
        // adding ERC165 data
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
        ds.supportedInterfaces[type(IERC173).interfaceId] = true;
        ds.supportedInterfaces[type(IVaultAccounting).interfaceId] = true;
        ds.supportedInterfaces[type(IVaultManagement).interfaceId] = true;
        ds.supportedInterfaces[type(IBidMarket).interfaceId] = true;
        ds.supportedInterfaces[type(IOptionMarket).interfaceId] = true;

        // add your own state variables
        // EIP-2535 specifies that the `diamondCut` function takes two optional
        // arguments: address _init and bytes calldata _calldata
        // These arguments are used to execute an arbitrary function using delegatecall
        // in order to set state variables in the diamond during deployment or an upgrade
        // More info here: https://eips.ethereum.org/EIPS/eip-2535#diamond-interface
        PunkTokenStorage storage pts = LibStorage.punkTokenStorage();
        pts.punkToken = cryptoPunks;
    }
}
