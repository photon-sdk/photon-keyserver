# photon-keyserver [![Build Status](https://travis-ci.org/photon-sdk/photon-keyserver.svg?branch=master)](https://travis-ci.org/photon-sdk/photon-keyserver)
2FA server for encrypted private key backup

## Usage & API docs

The easiest way to consume this service is to use the client library [photon-sdk/photon-lib](https://github.com/photon-sdk/photon-lib).

If you want to use the REST api directly, the [keyserver](https://github.com/photon-sdk/photon-lib/blob/master/src/keyserver.js) client module provides some good documentation. More examples can be found in the [integration tests](https://github.com/photon-sdk/photon-keyserver/blob/master/test/integration/rest.spec.js).

## Setup

```bash
nvm use
```

```bash
npm install
```

## Run tests

```bash
npm test
```

## Start local instance

```bash
npm start
```
