# Configuration Guide

## Using Different Config Profiles

The application always loads the `.env` file by default. This file contains all the **default values** used by the application and the code itself. If an environment-specific variable is missing in a `.env.{NODE_ENV}` file, the application will fall back to the value in `.env`.

If the `NODE_ENV` environment variable is set, an additional `.env.${NODE_ENV}` file is loaded, overriding any variables defined in the base `.env` file. This approach ensures environment-specific configurations without modifying the `.env` file directly.

### Example

**Base `.env` (default values):**
```env
GT_PORT=5500
GT_LOG_LEVEL=Info
```

**Production `.env.production` (overrides for production):**
```env
GT_PORT=7100
GT_LOG_LEVEL=Warn
```

When `NODE_ENV=prod`, the application:
1. Loads `.env` for default values.
2. Overrides specified variables with `.env.prod` (e.g., `GT_PORT` becomes `7100`).

**Do not edit the `.env` file directly** for environment-specific changes. Instead, create and use `.env.{NODE_ENV}` files (e.g., `.env.dev`, `.env.prod`).

## External Configuration Files

Configuration files are located in the `./config/` directory and follow a JSON array structure. All objects must be placed within an array when added to these configuration files.

### `ratelimiter.json`
Defines all active rate-limiting rules.

- **`method`**: Specifies the HTTP method (e.g., `GET`, `POST`) required for this rule to apply.
- **`regex`**: A regex pattern to identify routes affected by the rule.
- **`max`**: The maximum number of allowed requests during the time window.
- **`seconds`**: The duration of the time window in seconds.

---

## Environment Variables

Environment variables configure essential application settings. Below is a detailed description of each variable:

### General Configuration

- **`GT_PORT`**: Specifies the port on which the API runs.
- **`GT_STRICT_AUTH`**: Boolean that determines if unauthenticated requests are allowed on the `/players/:uuid` route. Set to `true` to require valid authorization for all requests.
- **`GT_LOG_LEVEL`**: Specifies the level of logging detail. Valid values: `Error`, `Warn`, `Info`, `Debug`.
- **`GT_BASE_URL`**: Defines the root URL of the API, excluding any trailing slashes. This is the URL where the API can be accessed and should be consistent with your deployment setup.
- **`GT_ICON_URL`**: Provides a URL template for accessing role icons. The `{role}` placeholder in the template will be dynamically replaced with the role name.
- **`GT_MONGODB_CONNECTION`** (**required**): MongoDB connection string. Follow the [MongoDB documentation](https://www.mongodb.com/docs/manual/reference/connection-string/) to construct this string.

---

### Proxy Settings

- **`GT_PROXY_ENABLED`**: Boolean that determines if the API should operate behind a proxy. Set to `true` to enable trusting a header for real client IPs.
- **`GT_PROXY_IP_HEADER`**: The name of the HTTP header that contains the real client IP address when the API is behind a proxy. Common values include `x-forwarded-for` or `cf-connecting-ip`. Defaults to `x-real-ip`.

---

### Tag Validation Settings

- **`GT_VALIDATION_TAG_MIN_LENGTH`**: Minimum character length for tags.
- **`GT_VALIDATION_TAG_MAX_LENGTH`**: Maximum character length for tags.
- **`GT_VALIDATION_TAG_BLACKLIST`**: Array of prohibited keywords that tags cannot contain.
- **`GT_VALIDATION_TAG_WATCHLIST`**: Array of keywords that will flag a tag and add the player to a watchlist.
- **`GT_VALIDATION_ICON_MAX_RESOLUTION`**: Maximum resolution (e.g., `512` for 512x512) for custom icons.
- **`GT_VALIDATION_ICON_BLACKLIST`**: Array of disallowed default icons.
- **`GT_VALIDATION_NOTES_MAX_LENGTH`**: Maximum character length for staff notes.
- **`GT_VALIDATION_ROLE_NAME_MAX_LENGTH`**: Maximum character length for role names.

---

### GitHub Configuration

- **`GT_GITHUB_OWNER`**: GitHub repository owner's username.
- **`GT_GITHUB_REPOSITORY`**: Name of the GitHub repository.
- **`GT_GITHUB_BRANCH`**: Branch name to fetch the latest commit.

---

### Error Reporting and Metrics

- **`GT_SENTRY_ENABLED`**: Enables or disables error reporting using Sentry.
- **`GT_SENTRY_DSN`**: Sentry DSN (Data Source Name) for exception logging.
- **`GT_METRICS_ENABLED`**: Enables or disables periodic metrics generation.
- **`GT_METRICS_CRON`**: Cron expression defining the schedule for metric generation.
- **`GT_METRICS_ADMIN_ROLE`**: Role required for a player to be recognized as an admin in metrics.

---

### Email Configuration

- **`GT_MAILER_ENABLED`**: Enables or disables the email-sending feature.
- **`GT_MAILER_HOST`**: Hostname of the mail server.
- **`GT_MAILER_PORT`**: Port number for the mail server (e.g., `465` for SMTPS).
- **`GT_MAILER_SECURE`**: Boolean determining whether to use a secure protocol.
- **`GT_MAILER_AUTH_USERNAME`**: Username for authenticating with the mail server.
- **`GT_MAILER_AUTH_PASSWORD`**: Password for authenticating with the mail server.
- **`GT_MAILER_SENDER_ADDRESS`**: Email address used as the sender.
- **`GT_MAILER_SENDER_NAME`**: Name displayed as the sender.

---

### Ratelimiting

- **`GT_RATELIMITER_ENABLED`**: Boolean to enable or disable rate-limiting protection for routes. See the [ratelimiter configuration](#ratelimiterjson).

---

### Discord Bot Configuration

- **General**
    - **`GT_DISCORD_BOT_ENABLED`**: Enables or disables the Discord bot.
    - **`GT_DISCORD_BOT_TOKEN`**: Token used for bot authentication.
    - **`GT_DISCORD_BOT_SERVER`**: ID of the main Discord guild for various feature including role synchronization.

- **Role Synchronization**
    - **`GT_DISCORD_BOT_SYNCED_ROLES_ENABLED`**: Enables role synchronization between GlobalTags and Discord.
    - **`GT_DISCORD_BOT_SYNCED_ROLES_{ROLE}`**: Maps GlobalTags roles to Discord role IDs. Example:
        ```env
        GT_DISCORD_BOT_SYNCED_ROLES_ADMIN=123456,987654
        ```

- **Notifications and Logs**
    - **Reports**:
        - **`GT_DISCORD_BOT_REPORTS_ENABLED`**: Enables sending reports to a Discord channel.
        - **`GT_DISCORD_BOT_REPORTS_CHANNEL`**: ID of the Discord channel for reports.
        - **`GT_DISCORD_BOT_REPORTS_CONTENT`**: Message content template (e.g., to mention roles).

    - **Watchlist**:
        - **`GT_DISCORD_BOT_WATCHLIST_ENABLED`**: Enables logging watchlist events to a channel.
        - **`GT_DISCORD_BOT_WATCHLIST_CHANNEL`**: ID of the channel for watchlist logs.

    - **Ban Appeals**:
        - **`GT_DISCORD_BOT_APPEALS_ENABLED`**: Enables ban appeals and their notifications.
        - **`GT_DISCORD_BOT_APPEALS_CHANNEL`**: ID of the channel for ban appeals.

    - **Moderation Logs**:
        - **`GT_DISCORD_BOT_MODLOG_ENABLED`**: Enables staff action logging to a channel.
        - **`GT_DISCORD_BOT_MODLOG_CHANNEL`**: ID of the moderation log channel.

    - **User referrals**:
        - **`GT_DISCORD_BOT_REFERRALS_ENABLED`**: Decides whether or not user referrals should be sent into a Discord channel.
        - **`GT_DISCORD_BOT_REFERRALS_CHANNEL`**: Specifies the ID of the Discord channel where referral messages are sent.

    - **Account connections**:
        - **`GT_DISCORD_BOT_ACCOUNT_CONNECTIONS_ENABLED`**: Enables or disables the ability for users to link their Discord account (via `/gt link discord` in-game or `/link` on Discord).  
        - **`GT_DISCORD_BOT_ACCOUNT_CONNECTIONS_HIDE_EMAILS`**: Enables or disables if emails should be redacted in the log or not.
        - **`GT_DISCORD_BOT_ACCOUNT_CONNECTIONS_CHANNEL`**: Specifies the Discord channel ID where new account connection notifications are sent.  
        - **`GT_DISCORD_BOT_ACCOUNT_CONNECTIONS_ROLE`**: Defines the ID of a Discord role treated as a "Verified" role for linked accounts.

    - **Custom Icons**:
        - **`GT_DISCORD_BOT_CUSTOM_ICONS_ENABLED`**: Enables notifications for custom icon updates.
        - **`GT_DISCORD_BOT_CUSTOM_ICONS_CHANNEL`**: ID of the channel for custom icon logs.

    - **Entitlements (SKUs)**:
        - **`GT_DISCORD_BOT_ENTITLEMENTS_ENABLED`**: Enables SKU subscription logging.
        - **`GT_DISCORD_BOT_ENTITLEMENTS_CHANNEL`**: ID of the channel for entitlement logs.