# :label: GlobalTag API
![Downloads](https://labybadges-delta.vercel.app/api/downloads/globaltags/formatted)<br>
This repository contains the backend API of the [GlobalTags](https://github.com/RappyLabyAddons/GlobalTags) LabyMod [addon](https://flintmc.net/modification/142.globaltags) powered by Elysia and Bun.

## 💪 Prerequisites
* [Git](https://git-scm.com/downloads)
* [MongoDB](https://mongodb.com)
* Option 1
  * [Bun](https://bun.sh)<br>
* Option 2
  * [Docker](https://www.docker.com)
    * [Docker Compose](https://docs.docker.com/compose/) *(Optional)*

## :package: Installation
```bash
# Clone the repository
$ git clone https://github.com/RappyLabyAddons/GlobalTagAPI
$ cd GlobalTagAPI

# Copy the config
$ cp config.json.example config.json # Edit the config to your liking.
```
### 🍞 Bun
```bash
# Install the required dependencies
$ bun i

# Try running it
$ bun dev

# Install pm2
$ npm install pm2 -g && pm2 install pm2-logrotate

# Run the API daemonized
$ pm2 start src/index.ts --interpreter ~/.bun/bin/bun --name GlobalTagAPI
```
### 🐋 Docker
```bash
# Option 1: With docker compose
$ docker compose up -d

# Option 2: Without docker compose
$ docker run -p 5000:5000 $(docker build -q .)
```