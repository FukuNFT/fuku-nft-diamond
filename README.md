# Fuku

Earn DeFi yields while trading NFTs. Fuku is a decentralized marketplace that allows buyers to place bids on non-fungible tokens (NFTs) while the underlying assets on their bids are earning yield by farming various DeFi protocols. Fuku bridges the two largest user bases in web3 and provides additional liquidity for NFT collections while giving buyers and sellers increased functionality in making NFT purchases. Fuku also offers advanced trading features such as batch bidding and options trading.

## Fuku Diamond

Fuku implements the diamond pattern, [EIP-2535](https://eips.ethereum.org/EIPS/eip-2535). This architecture was chosen to allow the Fuku marketplace to develop into a highly modular, gas optimized, and easily upgradeable codebase. This design pattern has the added benefit of providing a single point-of-entry and limitless contract size for easy front-end integration.

Further reference material on the diamond pattern include the following:

- [Introduction to EIP-2535 Diamonds](https://eip2535diamonds.substack.com/p/introduction-to-the-diamond-standard) by Nick Mudge
- [The Diamond Standard: A new paradigm for upgradeability](https://medium.com/derivadex/the-diamond-standard-a-new-paradigm-for-upgradeability-569121a08954) by Ainsley Sutherland
- [Understanding Diamonds on Ethereum](https://dev.to/mudgen/understanding-diamonds-on-ethereum-1fb) by Nick Mudge
- [Ethereum's Maximum Contract Size Limit is Solved with the Diamond Standard](https://dev.to/mudgen/ethereum-s-maximum-contract-size-limit-is-solved-with-the-diamond-standard-2189) by Nick Mudge

## Terminology

The diamond pattern introduces new terminology for describing the components of its architecture.

- The `diamond` is the proxy contract, it is the single point-of-entry to the different `facets`.
- A `facet` is a logical component of the `diamond` with a set of exposed public functions. These `facets` are added to the `diamond` through a `cut` function call.
- The `cut` function provides functionality to add, remove, or update `facets` of the `diamond`. The `cut` is also used for the initialization of the `diamond`.
- A [`selector`](https://docs.soliditylang.org/en/v0.8.10/abi-spec.html#function-selector) is the first four bytes of the call data for a function call. Cutting multiple of the same `selector` is not allowed.
- Each `diamond` will provide a `loupe` `facet` that provides introspection functions for the `diamond` itself. This can be used to lookup `facets` and functions already registered with the `diamond`.

## Organization

The various smart contracts are organized into a few different places.

- Facets are stored in the [`contracts/facets/`](.contracts/facets/) directory. They implement the interfaces found in the [`contracts/interfaces/facets/`](./contracts/interfaces/facets/) directory.
- Libraries are stored in the [`contracts/libraries/`](./contracts/libraries/) directory and contain [`contracts/libraries/LibStorage.sol`](./contracts/libraries/LibStorage.sol) Fuku's [Diamond Storage](#diamond-storage).
- Vendored contracts are stored in the [`contracts/vendor/`](./contracts/vendor/) directory.
- The [`contracts/FukuInit.sol`](./contracts/FukuInit.sol) contract is provided at the root because it is only used by the `diamondCut` process.
- The [`contracts/FukuTypes.sol`](./contracts/FukuTypes.sol) file is also provided at the root because it only provides enum and struct types for the rest of the contracts — it is not a contract itself.

## Diamond Storage

Contract state is shared with a pattern called [Diamond Storage](https://dev.to/mudgen/how-diamond-storage-works-90e).

## Implementation references

Much of the Fuku Diamond code was based on Nick Mudge's [diamond-3-hardhat](https://github.com/mudgen/diamond-3-hardhat) repository at the [7feb995](https://github.com/mudgen/diamond-3-hardhat/tree/7feb995) commit.

## Deployment

### Rinkeby

Diamond: `0x92b5E83e22AE79DA3BbF811A3dC4f2036cB3623f`

CryptoPunks: `0x4f599C9703691a545F752C3c0d50e97fC030146C`

Fuku Token: `0xcAc88c6f414a30a124F243d77f4a054eB99b0A7d`

Empty Vault Name: `0xeeeeeeeeeeeeeeeeeeeeeeee`

## Setup

After cloning the repository, run:

`> npm install`

To compile, run:

`> npx hardhat compile`

To run the tests, create `.env` file according to `.env.example`, and run:

`> npx hardhat test`

To create documentation, run:

`> npx hardhat docgen`
