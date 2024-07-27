# :label: GlobalTag API
This repository contains the backend API of the GlobalTagDB for the Minecraft modification GlobalTags.

## 💪 Prerequisites
* [Git](https://git-scm.com/downloads) (Windows only)
* A [MongoDB](https://mongodb.com) instance
* [Bun](https://bun.sh)
* [Docker](https://www.docker.com)
  * [Docker Compose](https://docs.docker.com/compose/) *(Optional)*

## :package: Installation
```bash
# Clone the repository
$ git clone https://github.com/Global-Tags/API gtapi
$ cd gtapi

# Copy the config
$ cp config.json.example config.json # Edit the config to your liking.

# Install the accent cli and pull the translation files
$ bun i -g accent-cli
$ chmod +x sync.sh
$ ./sync.sh
```
### 🍞 Run with Bun (that rhymes)
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
### 🐋 Run with Docker
```bash
# Option 1: With docker compose
$ docker compose up -d

# Option 2: Without docker compose
$ docker run -p 5000:5000 $(docker build -q .)
```

## 🤝 Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md)

## 🔨 Known Usages
- Java Wrapper: [[Maven Central](https://central.sonatype.com/artifact/com.rappytv.globaltags/GlobalTagsJava)] [[GitHub](https://github.com/Global-Tags/Java)]
  - [LabyMod](https://labymod.net) Addon: [[FlintMC](https://flintmc.net/modification/142.globaltags)] [[GitHub](https://github.com/Global-Tags/LabyAddon)]
- Typescript Wrapper: [[NPM Repository](https://www.npmjs.com/package/globaltags.ts)] [[GitHub](https://github.com/Global-Tags/Typescript)]
