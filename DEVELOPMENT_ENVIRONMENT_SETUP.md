# Development environment setup

The following instructions describe how to setup the required elements to run op-middleware in a local development environment that has the Ocean Protocol stack and Powergate running (alongside with Lotus and IPFS).

- [1. Powergate and IPFS node setup](#1-Powergate-and-IPFS-node-setup)
- [2. Barge (Ocean Protocol stack without Commons)](#2-Barge-Ocean-Protocol-stack-without-Commons))
- [3. Spin up op-middleware](#3-Spin-up-op-middleware)
- [4. Adapted Commons' UI](#4-Adapted-Commons%E2%80%99-UI)

## 1. Powergate and IPFS node setup

Powergate's [local devnet](https://docs.textile.io/powergate/localnet/) needs to be running, based on the [`0.0.1-beta.10` tag](https://github.com/textileio/powergate/releases/tag/v0.0.1-beta.10).

The IPFS gateway port needs to be exposed and the docker service will be configured to be restarted automatically if needed. In order to do so, the following changes neeed to be applied to the file [/docker/docker-compose-devnet.yaml](https://github.com/textileio/powergate/blob/933e5e58aa8da3ce396eb3a91bce966e9d1ab936/docker/docker-compose-devnet.yaml):

### Expose IPFS gateway port and setup the docker service to auto-restart

It is recommended to expose the IPFS gateway port, make the service auto-restart and add a volume to persist everything.
To that end, take the file [/docker/docker-compose-devnet.yaml](https://github.com/textileio/powergate/blob/933e5e58aa8da3ce396eb3a91bce966e9d1ab936/docker/docker-compose-devnet.yaml) and duplicate line 23. Replace in the new line the occurrences of `5001` with `8080`, so that the final result will be `- 8080:8080`.
Copy line 19 and paste it below the line containing `- 8080:8080` that was just added.
Finally, to add a volume, a section below the `version: 3.7` in the file should be added:

```yaml
volumes:
  powergate-devnet-ipfs:
```

The resulting ipfs section should look as follows:

```yaml
  ipfs:
    ports:
      - 5001:5001
      - 8080:8080
    restart: unless-stopped
    volumes:
      - powergate-devnet-ipfs:/data/ipfs
```

### Configure CORS in IPFS daemon

This step implies running some commands "inside" the corresponding docker container:

1) connect/run the shell in the corresponding docker container

```sh
docker exec -it localnet_ipfs_1 sh
```

2) run the ipfs commands listed below (more details [in this link, search for "CORS"](https://docs.ipfs.io/reference/cli/#ipfs-daemon))

```sh
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "GET", "POST"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Headers '["Authorization"]'
ipfs config --json API.HTTPHeaders.Access-Control-Expose-Headers '["Location"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Credentials '["true"]'
```

3) restart the ipfs daemon. This will disconnect the shell, but the restart is needed to apply the config.

```sh
killall ipfs
```

## 2. Barge (Ocean Protocol stack without Commons)

At the moment of writing this documentation the environment used the version from commit [`master/f996fb1`](https://github.com/oceanprotocol/barge/commit/f996fb1db2b6f79ac6b5b3a50f1dfcb940a807a9) (dependencies and how to checkout the project are topics very well documented in the corresponding repository). The specific command to run the stack is:

```
./start_ocean.sh --no-dashboard --no-commons
```

In order to verify that the consume flow works using the custom IPFS node (provided by Powergate), the [line 89 of the start_ocean.sh script needs to be modified to use your machine's IP + port `5001`](https://github.com/oceanprotocol/barge/blob/f996fb1db2b6f79ac6b5b3a50f1dfcb940a807a9/start_ocean.sh#L89). The resulting line should look like:

```bash
export BRIZO_IPFS_GATEWAY=http://your_machine_IP:5001
```

If Barge must be stopped for some reason and then re-started later, the command to resume it should use the option `--local-spree-no-deploy` to prevent re-deploying contracts (check Barge's documentation for more details).

## 3. Spin up op-middleware

The middleware needs a running instance of MongoDB. If you run the `docker-compose.yaml` file to spin up these elements the environment will have:

* the MongoDB instance exposing the port `27317` _(this is not quite standard, but we do it to prevent conflicts with [Barge's MongoDB instance](https://github.com/oceanprotocol/barge/blob/f996fb1db2b6f79ac6b5b3a50f1dfcb940a807a9/start_ocean.sh#L345))_.
* the middleware's **build** will be up and listening for requests at port `3333`.

For more configuration envs, check the `docker-compose.yaml` file and the instructions from `README.md`.

NOTE: it is also possible to start a MongoDB container based on the `docker-compose.yaml` file config and run the middleware in _development mode_ via `npm run start:dev`. This configuration might be more suitable for making changes.

## 4. Adapted Commons' UI

To queue the cold-storage of files that are pinned to the IPFS node, a an adapted version of Commons can be found at https://github.com/unjapones/commons/, branch `2.4.1-filecoin-POC_improve-IPFS`. This version of the UI is meant to communicate with the IFPS node provided by Powergate's local devnet and the middleware.

The steps to spin up Commons are listed in the project's README (note that Commons' components will be launched/started locally and not-dockerized), but also a couple of env values must be added to the `client/.env.local` file before starting or building the app. In addition to use the env values to connect to Barge/Spree, the following variables must be configured:

```env
# From configuration step "Powergate and IFPS node setup"
REACT_APP_IPFS_GATEWAY_URI="http://localhost:8080"
REACT_APP_IPFS_NODE_URI="http://localhost:5001"
# From configuration step "Spin up op-middleware"
REACT_APP_OP_MIDDLEWARE_URI="http://localhost:3333"
```

The same goes for the env file of the server `server/.env`:

```env
IPFS_GATEWAY_URI='http://localhost:8080'
```