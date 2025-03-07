# GlobalTags API

The **GlobalTags API** is the core component that enables communication between mod wrappers and the database. This guide will walk you through the usage of the API and offer solutions to common issues.

???+ info "Selfhosting"
    If you want to host your own instance of the GlobalTagsAPI, see the [Self-hosting Guide](./self-hosting.md).

## Available Routes and How to Use Them

For a complete list of available routes and detailed documentation on how to use them, visit our <a href="https://api.globaltags.xyz/docs" target="_blank">API documentation</a>. If you're interested in using the API within a specific programming language, don't forget to check out our various language wrappers for implementation examples.

## Authentication

To interact with the GlobalTags API, proper authentication is essential. Here's how our authentication process works:

### How Authentication Works

You authenticate by passing an `Authorization` header with your request. This header consists of two parts: the authentication provider ID (`id`) and the token (`token`). The format of the header looks like this:

```
Authorization: <id> <token>
```

### What is an Authentication Provider?

An **authentication provider** (or **auth provider** for short) is the system that verifies the token and extracts a player's UUID from it. This design allows the API to work flexibly across different environments, ensuring broad compatibility.

By using auth providers, we make it easy to integrate GlobalTags with various authentication systems while keeping the API secure and adaptable.

### Example

???+ note "Default Authentication Providers"
    Here are the three default authentication providers supported by GlobalTags:

    - **Minecraft** (`YggdrasilProvider`): Requires a Minecraft access token as the `token` parameter.
    - **LabyConnect** (`LabyConnectProvider`): Requires a LabyConnect session token as the `token` parameter.
    - **Bearer** (`ApiKeyProvider`): Requires an API token, which must be manually assigned to an account by staff.

Let's walk through an example to illustrate how the authentication process works. Suppose you send the following `Authorization` header in your request:

```
Authorization: Minecraft someminecraftsessiontoken
```

Here's what happens next:

1. The API looks for an authentication provider that matches the `id` - in this case, `Minecraft`.
2. It verifies the provided token (`someminecraftsessiontoken`) and attempts to extract a UUID from it.
3. If no matching auth provider is found, or if verification fails, you will receive an error.

### Creating Your Own Auth Provider

Want to create your own custom authentication provider? [This guide](./custom-auth-provider.md) covers everything you need to know.

## Image Serving

Icons and role images play a key role in GlobalTags, so the API provides specific routes to serve these images. Below are the routes you can use to access the three types of icons.

### Accessing Default Global Icons
To load default icons, use the following URL format, replacing `<name>` with the lowercase name of the icon:
```plaintext
https://cdn.rappytv.com/globaltags/icons/<name>.png
```

### Accessing Custom Global Icons
For custom per-player icons, you’ll need the `hash` value, which can be obtained by making a `GET` request to `/players/<uuid>` and retrieving the `icon.hash` key. Then, use the following URL format:
```plaintext
https://api.globaltags.xyz/players/<uuid>/icon/<hash>
```

### Accessing Role Icons
To load role-specific icons, use the URL format below, replacing `<name>` with the role name:
```plaintext
https://cdn.rappytv.com/globaltags/icons/role/<name>.png
```

## Troubleshooting

### 1. **Database Connection Issue**

**Error message**: `The database is not connected. Please try again later!`

**Cause**: This error indicates that the API could not establish a connection to the database.

**Solution**: Wait for a few minutes, as this issue is often temporary. If the problem persists for more than 5 minutes, please report it to our team through our <a href="https://globaltags.xyz/discord" target="_blank">Discord Server</a>.

---

### 2. **Unknown Error**

**Error message**: `An unknown error ocurred! Please try again later`

**Cause**: This error occurs due to an internal issue while processing your request. The system returns a generic error message to avoid exposing sensitive information.

**Solution**: Be patient, as resubmitting the request likely won't fix the issue. However, the development team will be automatically notified, and we will work on resolving it. If the error resolves itself, feel free to continue.