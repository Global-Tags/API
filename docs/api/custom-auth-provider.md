# Creating your own auth provider for the API

Thank you for your interest in contributing to the GlobalTags API! Contributions are welcome and greatly appreciated.

## Setting Up Your Development Environment

1. **Create a fork of the <a href="https://github.com/Global-Tags/API/fork" target="_blank">API repository</a>**
1. **Clone your fork of the Repository**
2. **Install Dependencies**
    
    Ensure you have [bun](https://bun.sh) installed. Then run:
    ```sh
    bun i
    ```

3. **Create a config**

    See [Create a Configuration File](./self-hosting.md#2-create-a-configuration-file)

4. **Run the API**
    ```sh
    bun dev
    ```

## Step-by-Step Guide

???+ info
    The GlobalTags API uses an `AuthProvider` class to handle authentication. To extend the authentication mechanism, you can implement your own class by extending `src/auth/AuthProvider`.

???+ important "Basic Information"
    As outlined in the [How Authentication Works](./guide.md#how-authentication-works) section, the `Authorization` header must consist of two values: `id` and `token`.

    You need to define the following values:

    - **`id`**: The unique identifier for your provider. In this example, we'll use `Testing` as the `id`.
    - **`name`**: A descriptive name for your service, such as the name of the authentication mechanism. In this example, we'll use `MyService` as the `name`. (1)
        { .annotate }
        
        1. This `name` is used only for naming files and classes; it has no effect on the code itself.
    
    If you're unsure about the implementation, you can refer to the existing <a href="https://github.com/Global-Tags/API/tree/master/src/auth/providers" target="_blank">`AuthProvider` implementations</a> for guidance.

### 1. Create a New `AuthProvider` Class

Create a new file in the `src/auth/providers` directory, for example, `MyServiceProvider.ts`, that extends `AuthProvider`. You need to implement the `#getUUID` method and initialize the constructor.

```typescript
import AuthProvider from "../AuthProvider";

export default class MyServiceProvider extends AuthProvider {
    constructor() {
        super('Testing'); // (1)
    }

    async getUUID(token: string): Promise<string | null> { // (2)
        return "00000000-0000-0000-0000-000000000000"; // (3)
    }
}
```

1. This is the `id` value for your provider.
2. The `token` parameter refers only to the token itself and does not include the authentication provider `id`.
3. Implement the logic to securely verify the token. This could involve an API request or verifying a JWT. Return `null` if the token does not map to a valid UUID.

### 2. Test Your Custom `AuthProvider`

To test your custom authentication provider, send a `POST` request to `/players/<uuid>` with the appropriate `Authorization` header in the format `<id> <token>`. For this example, a header could look like this:

```
Authorization: Testing somerandomtoken
```

## Submitting Changes

You can then submit the changes by opening a pull request with a clear title and description of your changes.

## License

By contributing to GlobalTags API, you agree that your contributions will be licensed under the <a href="https://github.com/Global-Tags/API/blob/master/LICENSE" target="_blank">MIT License</a>.

---

Thank you for your contributions! Your efforts help improve the GlobalTags API for everyone.
