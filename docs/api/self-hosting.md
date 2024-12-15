# Self-hosting the GlobalTagsAPI

## Run with bun (that rhymes)

### 1. Clone the Repository

Start by cloning the repository to your local machine:

```bash
git clone https://github.com/Global-Tags/API gtapi
cd gtapi
```

### 2. Create a Configuration File

Next, create a configuration file by copying the example provided. See the [Configuration guide](./configuration-guide.md).

```bash
cp .env .env.prod
```

### 3. Launching the API

Now use the following command to install the necessary dependencies:
```bash
bun install --production
```

To run the API, execute:

```bash
bun start
```

???+ info "Hosting the API"
    To keep the API online, install a tool called `pm2` to daemonize the process:
    ```bash
    # Install pm2 and pm2-logrotate globally
    bun i -g pm2 pm2-logrotate

    # Start the daemon
    pm2 start "bun start" --name GlobalTagsAPI
    ```

## Run with docker

### 1. Clone the Repository

Start by cloning the repository to your local machine:

```bash
git clone https://github.com/Global-Tags/API gtapi
cd gtapi
```

You can now edit your `.env` file and the configs in `./config`.

### 2. Launching the API
Then you can run the API:
```bash
# Using docker
docker run --name gtapi -itd -p 5500:5500 -v ./config:/app/config -v ./icons:/app/icons rappytv/globaltagsapi:latest

# OR

# Using docker compose
docker compose up -d
```
