![Docker Build](https://github.com/whatasave/demo-repository/actions/workflows/docker-build.yml/badge.svg)

# Codeduel Backend (crab)

## Setup

```bash
# install bun on windows
> powershell -c "irm bun.sh/install.ps1|iex"

# install bun on macOS and Linux
$ curl -fsSL https://bun.sh/install | bash

$ bun install
```

## Docker

```bash
# build
docker build -t codeduel-be .

# run
$ docker run -p 3000:80 codeduel-be

# go to http://localhost:3000/v1/health/liveness
```

### Start a PostgreSQL

```bash
$ docker run --name cd-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_USER=user -e POSTGRES_DB=codeduel -p 5432:5432 -d postgres

# for tests
$ docker run --name cd-postgres-test -e POSTGRES_PASSWORD=password -e POSTGRES_USER=user -e POSTGRES_DB=codeduel-test -p 5433:5432 -d postgres
```
