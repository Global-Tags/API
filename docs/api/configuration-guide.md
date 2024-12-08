# Configuration Guide

### `port`
This integer specifies the port the API should be running on.

### `ipHeaders`
This array of strings represent the headers which can contain the real IP of the client requesting the API. This value should be set by your proxy which the API is running behind.

### `strictAuth`
This boolean decides if unauthenticated clients can request the `/players/:uuid` route to get a player's tag info or not. If `false` all requests to that route need to pass a valid authorization header.

### `logLevel`
This string tells the `Logger` script which information to log or not.

Available values are:

- `Error`
- `Warn`
- `Info`
- `Debug`

### `mongodb` **!**
This is the <a href="https://www.mongodb.com/docs/manual/reference/connection-string/" target="_blank">connection</a> string which is used to connect to the MongoDB database. This is the only option which you are **required** to change in the example config.

### `base`
This string is primarily used in the Discord Client to display custom icons.

### `validation.tag.min`
This option specifies the minimum length allowed for tags.

### `validation.tag.max`
This option specifies the maximum length allowed for tags.

### `validation.tag.blacklist`
This string array contains specific keywords which then can't be included in tags.

### `validation.tag.watchlist`
This string array contains specific keywords which will put a player on the watchlist if the keyword is included in a tag.

### `validation.icon.maxResolution`
This integer specifies the maximum resolution for custom icons. For example if you want the maximum resolution to be 512x512, you put 512

### `validation.icon.blacklist`
This string array prevents players from selecting specific default icons.

### `validation.notes.max_length`
This strings limits staff notes in its length.

### `github.owner`
This option is used to retrieve the owner of the GitHub repository for the GitHub commit data.

### `github.repository`
This option is the name of the GitHub repository for the GitHub commit data.

### `github.branch`
This option specifies the branch to get the latest commit from

### `sentry.enabled`
This option decides whether Sentry should be used to capture exceptions or not.

### `sentry.dsn`
Here you can enter your Sentry dsn which is used to send any exceptions to.

### `metrics.enabled`
This option decides whether metrics should be created periodically or not.

### `metrics.cron`
This string is the cron representation of the period in which metrics are being created.

### `metrics.admin_role`
This option decides which role a player has to have to be counted as an admin.

### `mailer.enabled`
This option enables or disables the mailer.

### `mailer.host`
This option chooses the mail server to send mails from.

### `mailer.port`
This option chooses the port. Example: If you're using SMTPS, enter 465 and set `mailer.secure` to `true`.

### `mailer.secure`
This option chooses whether to use the secure variant of your mail protocol.

### `mailer.auth.username`
This option is used as the username to authenticate with the mail host.

### `mailer.auth.password`
This option is used as the password to authenticate with the mail host.

### `mailer.sender.address`
This option contains the address where emails should be sent from.

### `mailer.sender.name`
This option is the name which is being used to send mails.

### `ratelimit.active`
This option decides whether to protect routes with a ratelimit or not.

### `ratelimit.routes[x].method`
This option specifies the http method which needs to be used for this rule to apply.

### `ratelimit.routes[x].regex`
This option specifies a regex to match routes which are affected by this rule.

### `ratelimit.routes[x].max`
This option specifies the max requests which can be submitted in the time window.

### `ratelimit.routes[x].seconds`
This option specifies the time window in seconds.

### `roles[x].name`
This option specifies the role's name

### `roles[x].permissions`
This option is a permission-boolean keymap.

## TODO: Finish config documentation

### `bot.enabled`
### `bot.token`
### `bot.synced_roles.enabled`
### `bot.synced_roles.guild`
### `bot.synced_roles.roles`
### `bot.reports.active`
### `bot.reports.channel`
### `bot.reports.content`
### `bot.watchlist.active`
### `bot.watchlist.channel`
### `bot.watchlist.content`
### `bot.appeals.active`
### `bot.appeals.channel`
### `bot.appeals.content`
### `bot.mod_log.active`
### `bot.mod_log.channel`
### `bot.referral.active`
### `bot.referral.channel`
### `bot.connection.active`
### `bot.connection.role`
### `bot.connection.log`
### `bot.entitlements.enabled`
### `bot.entitlements.log`
### `bot.entitlements.skus[x].id`
### `bot.entitlements.skus[x].name`
### `bot.entitlements.skus[x].role`
### `bot.entitlements.skus[x].discordRole`
### `bot.custom_icons.enabled`
### `bot.custom_icons.log`