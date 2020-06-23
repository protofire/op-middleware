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

The development environment is assumed to be running [Powergate's devnet setup](https://docs.textile.io/powergate/devnet/#devnet-with-powergate) plus a MongoDB instance. The setup of the components is documented on each project's repository but a [`docker-compose.yaml`](https://gist.github.com/unjapones/49a3ed76ef04472bc3cf1da512f4eb60) file has been created to make the development environment setup easier. To spin up the environment specified by the docker-compose file run the following (refer to [`docker`](https://docs.docker.com/engine/reference/run/) and [`docker-compose`](https://docs.docker.com/compose/reference/overview/) documentation for more information):

```sh
docker-compose -p op-middleware-devnet -f docker-compose.yaml up
```

To configure the port that `op-middleware` will listen on for requests, the Powergate server URI, MongoDB connection URI and other environmental variables create a copy of the file `.env.example`, name the copy `.env` and edit the corresponding values.

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

For more information, check the `script` attribute in the `package.json` file.

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
