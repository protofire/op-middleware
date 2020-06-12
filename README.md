# op-middleware


POC middleware to use Filecoin as a storage strategy.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
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

op-middleware is an expressed/nodejs application that relies on Textile's Powergate and MongoDB (via Mongoose).

The development environment is assumed to be running [Powergate's devnet setup](https://docs.textile.io/powergate/devnet/#devnet-with-powergate) plus a MongoDB instance. The setup of the components is clearly documented on each project's repository/website but a [`docker-compose.yaml`](https://gist.github.com/unjapones/49a3ed76ef04472bc3cf1da512f4eb60) file has been created to make the development environment setup easier (although the maintenance of the docker-compose file is not guaranteed).

To configure the port that `op-middleware` will listen on for requests, the Powergate server URI, MongoDB connection URI and other environmental values check the file `src/config.ts`.

Once the development environment is ready, `op-middleware` can be started in development mode running the following:

```
npm run start:dev
```

Build the project and run it:

```
npm run start
```

Run unit tests/run tests in watch mode:

```
npm test
npm run test:watch
```

For more information, check the `script` attribute in the `package.json` file.

## Maintainers

[@protofire](https://github.com/protofire)

## Contributing

PRs accepted.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

MIT © 2020 ProtoFire
