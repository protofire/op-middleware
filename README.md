# op-middleware


POC middleware to use Filecoin as a storage strategy.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Environmental assumptions](#Environmental-assumptions)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

## Install

Clone the repository and install dependencies:

```
git clone https://github.com/protofire/op-middleware.git
npm install
```

## Usage

op-middleware is an express/nodejs application that relies on Textile's Powergate and MongoDB (via Mongoose).

The development environment is assumed to be running [Powergate's devnet setup](https://docs.textile.io/powergate/devnet/#devnet-with-powergate) plus a MongoDB instance. At the moment of writing this documentation, Powergate's tag [`v0.0.1-beta.10`](https://github.com/textileio/powergate/releases/tag/v0.0.1-beta.10) is assumed to be used.

To configure the port that `op-middleware` will use to expect requests, the Powergate server URI, MongoDB connection URI and other environmental variables create a copy of the file `.env.example` named `.env` and edit the corresponding values.

```sh
cp .env.example .env
```

Once the development environment is ready, `op-middleware` can be started in development mode running the following:

```sh
npm run start:dev
```

Run unit tests/run tests in watch mode:

```sh
npm test
npm run test:watch
```

Build the project and run it:

```sh
npm run start
```

For further information about the npm scripts, check the `script` attribute in the `package.json` file.

Alternatively, one can build and run the project using the following docker-compose command that will also spin up a MongoDB instance. Note that the environment variables defined in `docker-compose.yaml` will affect the `op-middleware` instance started this way:

```sh
docker-compose -p op-middleware -f docker-compose.yaml up
```

## API

The file `op-middleware.postman_collection.json` in the root of the project is a [Postman](https://www.postman.com/) collection that details how the requests and endpoints work.

## Environmental assumptions

### About FIL management and Powergate settings

op-middleware relies on the features provided by Powergate's FFS module: when an FFS instance is created a wallet is generated and assigned to it with a configurable funds amount from a master address (also configurable). These settings should be configured accordingly to fund the middleware actions.

To limit the FIL expenditure the following was considered:

- File size limit: `op-middleware` env variable, should limit the kind of files that will be stored on Filecoin and pinned in the IPFS node.
- Initial wallet funding: by configuring a master wallet or setting the corresponding FFS wallet funds.
- Cid configuration: Powergate may be configured in a conservatibe-way and the following features will be disabled by default to prevent automatic deals and FIL expenses,
  - store multiple replicas of the files in Filecoin
  - trigger retrieval-deal when a managed file (cid) is not found on the hot storage
  - repair/renew storage deals

### Interacting with Filecoin remote network

The *local-devnet* (configured by _Textile's devnet_) is used for development but the environment that resembles the final/main network is non-local or known as "remote network". At the time of writing this documentation there are two remote (and public) Filecoin networks: the [`Testnet`](https://docs.lotu.sh/en+join-testnet) and the [`Devnet`](https://docs.filecoin.io/how-to/build-interacting-with-the-network/#devnet). Powergate aims for the latest code on Lotus/master so a _Testnet_ node should be used when configuring the environment for op-middleware + a remote network.

After setting the Lotus node and syncing with the network, FIL can be requested for the corresponding wallet(s) using the Faucet linked on the instructions web. All the details about "remote network" can be consulted on the [Filecoin Docs - Interacting with the network](https://docs.filecoin.io/how-to/build-interacting-with-the-network/#running-your-own-remote-network)

## Maintainers

[@protofire](https://github.com/protofire)

## Contributing

PRs accepted.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

MIT © 2020 ProtoFire
