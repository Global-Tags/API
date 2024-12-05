# Self-hosting the GlobalTagsAPI

## Prerequisites
- <a href="https://bun.sh" target="_blank">Bun</a>
- A <a href="https://mongodb.com" target="_blank">MongoDB</a> instance
- <a href="https://www.docker.com" target="_blank">Docker</a>
    - <a href="https://docs.docker.com/compose/" target="_blank">Docker Compose</a> *(Optional)*

## Installation

### 1. Clone the Repository

Start by cloning the repository to your local machine:

```bash
git clone https://github.com/Global-Tags/API gtapi
cd gtapi
```

### 2. Create a Configuration File

Next, create a configuration file by copying the example provided. Adjust the settings in `config.json` as needed. The only mandatory change is the `srv` field, which should contain the connection string to your MongoDB instance.

```bash
cp config.json.example config.json
```

## 3. Running the API

### Run with Bun (that rhymes)

1. **Install Required Dependencies**

    Use the following command to install the necessary dependencies:

    ```bash
    bun i
    ```

2. **Start the API**

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
    pm2 start src/index.ts --interpreter ~/.bun/bin/bun --name GlobalTagAPI
    ```

### Run with Docker

You have two options for running the API with Docker:

- **Option 1: Using Docker Compose**

    Run the following command to start the API in detached mode:

    ```bash
    docker compose up -d # (1)
    ```

    1. If you'd like to test the setup, you can omit the `-d` option to run it in the foreground.

- **Option 2: Without Docker Compose**

    You can also run the API without Docker Compose by executing:

    ```bash
    docker run --name gtapi -itd -p 5500:5500 -v ./config.json:/app/config.json -v ./icons:/app/icons rappytv/globaltagsapi:latest
    ```