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
cp config.json.example config.json
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
    pm2 start src/index.ts --interpreter ~/.bun/bin/bun --name GlobalTagsAPI
    ```

## Run with docker

### 1. Download important files
First of all you need to create a config from the example config template:
```bash
mkdir gtapi
cd gtapi
curl -o config.json https://github.com/Global-Tags/API/blob/master/config.json.example
```
You can now edit the `config.yml` as you like. See the [Configuration guide](./configuration-guide.md).

If you're intending to use docker compose you also have to pull the compose file:
```bash
curl -O https://github.com/Global-Tags/API/blob/master/compose.yml
```

### 2. Launching the API
Then you can run the API:
```bash
# Using docker
docker run --name gtapi -itd -p 5500:5500 -v ./config.json:/app/config.json -v ./icons:/app/icons rappytv/globaltagsapi:latest

# Using docker compose
docker compose up -d
```
