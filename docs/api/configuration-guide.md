# Configuration Guide

## Using different config profiles

## External config files

Those external config files can be found in the `./config/` directory. Please note that all those files contain the json array structure so the following object definitions have to be in an array when putting them into a config.

### `ratelimiter.json`
This file includes all active rules for the ratelimiter.s

#### `method`
This option specifies the http method which needs to be used for this rule to apply.

#### `regex`
This option specifies a regex to match routes which are affected by this rule.

#### `max`
This option specifies the max requests which can be submitted in the time window.

#### `seconds`
This option specifies the time window in seconds.

### `roles.json`
This file includes all active roles which are availabke.

#### `name`
This option specifies the role's name

#### `permissions`
This option is a permission-boolean keymap.

### `skus.json`
This option includes all obtainable entitlement skus for subscriptions.

#### `id`
This option has to be the discord SKU id.

#### `name`
This option specifies the internal name for this SKU.

#### `role`
This option specifies the role to be given to subscribers.

#### `discord_role`
This option specifies the discord role to be given to subscribers if synced roles are enabled.

## Environment Variables

All important options are configured by those environment variables.

### `GT_PORT`
This integer specifies the port the API should be running on.

### `GT_PROXY_IP_HEADER`
This array of strings represent the headers which can contain the real IP of the client requesting the API. This value should be set by your proxy which the API is running behind.

### `GT_STRICT_AUTH`
This boolean decides if unauthenticated clients can request the `/players/:uuid` route to get a player's tag info or not. If `false` all requests to that route need to pass a valid authorization header.

### `GT_LOG_LEVEL`
This string tells the `Logger` script which information to log or not.

Available values are:

- `Error`
- `Warn`
- `Info`
- `Debug`

### `GT_MONGODB_CONNECTION` **!**
This is the <a href="https://www.mongodb.com/docs/manual/reference/connection-string/" target="_blank">connection</a> string which is used to connect to the MongoDB database. This is the only option which you are **required** to change in the example config.

### `GT_BASE_URL`
This string is primarily used in the Discord Client to display custom icons.

### `GT_VALIDATION_TAG_MIN_LENGTH`
This option specifies the minimum length allowed for tags.

### `GT_VALIDATION_TAG_MAX_LENGTH`
This option specifies the maximum length allowed for tags.

### `GT_VALIDATION_TAG_BLACKLIST`
This string array contains specific keywords which then can't be included in tags.

### `GT_VALIDATION_TAG_WATCHLIST`
This string array contains specific keywords which will put a player on the watchlist if the keyword is included in a tag.

### `GT_VALIDATION_ICON_MAX_RESOLUTION`
This integer specifies the maximum resolution for custom icons. For example if you want the maximum resolution to be 512x512, you put 512

### `GT_VALIDATION_ICON_BLACKLIST`
This string array prevents players from selecting specific default icons.

### `GT_VALIDATION_NOTES_MAX_LENGTH`
This strings limits staff notes in its length.

### `GT_GITHUB_OWNER`
This option is used to retrieve the owner of the GitHub repository for the GitHub commit data.

### `GT_GITHUB_REPOSITORY`
This option is the name of the GitHub repository for the GitHub commit data.

### `GT_GITHUB_BRANCH`
This option specifies the branch to get the latest commit from

### `GT_SENTRY_ENABLED`
This option decides whether Sentry should be used to capture exceptions or not.

### `GT_SENTRY_DSN`
Here you can enter your Sentry dsn which is used to send any exceptions to.

### `GT_METRICS_ENABLED`
This option decides whether metrics should be created periodically or not.

### `GT_METRICS_CRON`
This string is the cron representation of the period in which metrics are being created.

### `GT_METRICS_ADMIN_ROLE`
This option decides which role a player has to have to be counted as an admin.

### `GT_MAILER_ENABLED`
This option enables or disables the mailer.

### `GT_MAILER_HOST`
This option chooses the mail server to send mails from.

### `GT_MAILER_PORT`
This option chooses the port. Example: If you're using SMTPS, enter 465 and set `mailer.secure` to `true`.

### `GT_MAILER_SECURE`
This option chooses whether to use the secure variant of your mail protocol.

### `GT_MAILER_AUTH_USERNAME`
This option is used as the username to authenticate with the mail host.

### `GT_MAILER_AUTH_PASSWORD`
This option is used as the password to authenticate with the mail host.

### `GT_MAILER_SENDER_ADDRESS`
This option contains the address where emails should be sent from.

### `GT_MAILER_SENDER_NAME`
This option is the name which is being used to send mails.

### `GT_RATELIMITER_ENABLED`
This option decides whether to protect routes with a ratelimit or not.

## TODO: Finish config documentation

### `GT_DISCORD_BOT_ENABLED`
### `GT_DISCORD_BOT_TOKEN`
### `GT_DISCORD_BOT_SYNCED_ROLES_ENABLED`
### `GT_DISCORD_BOT_SYNCED_ROLES_GUILD`
### `GT_DISCORD_BOT_SYNCED_ROLES_{ROLE}`
### `GT_DISCORD_BOT_REPORTS_ENABLED`
### `GT_DISCORD_BOT_REPORTS_CHANNEL`
### `GT_DISCORD_BOT_REPORTS_CONTENT`
### `GT_DISCORD_BOT_WATCHLIST_ENABLED`
### `GT_DISCORD_BOT_WATCHLIST_CHANNEL`
### `GT_DISCORD_BOT_WATCHLIST_CONTENT`
### `GT_DISCORD_BOT_BAN_APPEALS_ENABLED`
### `GT_DISCORD_BOT_BAN_APPEALS_CHANNEL`
### `GT_DISCORD_BOT_BAN_APPEALS_CONTENT`
### `GT_DISCORD_BOT_MODLOG_ENABLED`
### `GT_DISCORD_BOT_MODLOG_CHANNEL`
### `GT_DISCORD_BOT_REFERRALS_ENABLED`
### `GT_DISCORD_BOT_REFERRALS_CHANNEL`
### `GT_DISCORD_BOT_ACCOUNT_CONNECTIONS_ENABLED`
### `GT_DISCORD_BOT_ACCOUNT_CONNECTIONS_ROLE`
### `GT_DISCORD_BOT_ACCOUNT_CONNTECTIONS_LOG`
### `GT_DISCORD_BOT_CUSTOM_ICONS_ENABLED`
### `GT_DISCORD_BOT_CUSTOM_ICONS_LOG`
### `GT_DISCORD_BOT_ENTITLEMENTS_ENABLED`
### `GT_DISCORD_BOT_ENTITLEMENTS_LOG`