# Self-hosting the GlobalTagsAPI

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
    pm2 start src/index.ts --name GlobalTagsAPI --interpreter ~/.bun/bin/bun # Or wherever your bun executable is
    ```

# Self-hosting the documentation

### 1. Clone the Repository

Start by cloning the repository to your local machine:

```bash
git clone https://github.com/Global-Tags/API gtapi
cd gtapi
```

### 2. Get into the virtualenv
To get into the virtualenv you need python and pip installed.

```bash
python -m venv .venv

# Windows
. ./.venv/bin/activate.bat

# Linux / macOS
. ./.venv/bin/activate
```

### 3. Install the dependencies and run mkdocs
```bash
pip install -r requirements.txt

mkdocs serve
```