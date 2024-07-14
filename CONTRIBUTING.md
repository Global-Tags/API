# Contributing to Global-Tags API

Thank you for your interest in contributing to the Global-Tags API! Contributions are welcome and greatly appreciated. There are many ways you can contribute to this project, including reporting issues, submitting bug fixes, adding new features, improving documentation, and more.

## Table of Contents

- [How to Contribute](#how-to-contribute)
- [Setting Up Your Development Environment](#setting-up-your-development-environment)
- [Implementing a Custom AuthProvider](#implementing-a-custom-authprovider)
- [Submitting Changes](#submitting-changes)
- [License](#license)

## How to Contribute

1. Fork the repository.
2. Clone your fork.
3. Create a branch for your feature or bug fix.
4. Implement your changes.
5. Push your branch to your fork.
6. Submit a pull request.

Please make sure your code adheres to the project's coding standards.

## Setting Up Your Development Environment

1. **Clone the Repository**
    ```sh
    git clone https://github.com/Global-Tags/API.git
    cd API
    ```

2. **Install Dependencies**
    Ensure you have [bun](https://bun.sh) installed. Then run:
    ```sh
    bun i
    ```

## Implementing a Custom AuthProvider

The Global-Tags API uses an `AuthProvider` class to handle authentication. To extend the authentication mechanism, you can implement your own class that extends `src/auth/AuthProvider`.

### Step-by-Step Guide

1. **Basic info**
   
    Authentication in the GlobalTag-API works like this:
    The `Authentication` header needs to consist out of two strings. The `AuthProvider` id and the token itself: `<id> <token>`

    What you have to do now is to choose an ID (referred as `YOURID` in the examples) which will be used to direct requests to your `AuthProvider`

3. **Create a new `AuthProvider` Class**
   
    Create a new file in the `src/auth/providers` directory, for example, `<YourClient>Provider.ts`, which extends `AuthProvider`.
    You need to implement the `#getUUID` method and initialize a constructor.

    ```typescript
    import AuthProvider from "../AuthProvider";

    export default class YOURSERVICENAMEProvider extends AuthProvider {
        constructor() {
            super('YOURID');
        }

        async getUUID(token: string): Promise<string | null> {
            // Your logic to securely verify the passed token securely. This can be done by requesting an API or verifying a JWT token (Or anything else, it's up to you)
            // The token does not contain the AuthProvider identifier. 
        }
    }
    ```

5. **Test Your Custom AuthProvider**

    To test your custom AuthProvider you just need to send a `POST` request to `/players/<some random uuid>` with the authorization header being `<YOURID> <Token>`.

## Submitting Changes

You can then submit the changes by opening a pull request with a clear title and description of your changes.

## License

By contributing to Global-Tags API, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for your contributions! Your efforts help improve the Global-Tags API for everyone.
