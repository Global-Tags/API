# Java Wrapper

???+ warning
    You'll need Java Development Kit (JDK) 17 or higher to be able to use the wrapper. This may change in the future.

## Overview
The **GlobalTags Java Wrapper** provides an easy-to-use class for interacting with the GlobalTags API. This wrapper simplifies the integration of custom player tags in a Minecraft mod, enabling developers to fetch tag data including the player's tag, icon, and roles. It offers various methods to authenticate with the API, handle cache, and translate color codes for text display.

## Features
- API interaction through a well-defined abstact class.
- Customizable color code translation for Minecraft text.
- Authentication support for different methods (e.g., token-based auth).
- Cache management to optimize performance.
- User agent customization for API identification.
- Multilingual support for API responses.

## Dependency installation
To use this wrapper in your Java project, you can add it via Maven or Gradle. The package includes all necessary dependencies and models required to integrate the GlobalTags API into your mod.

### Adding the Repository
=== ":octicons-file-code-16: Maven"

    ```xml
    <repository>
        <id>rappytv</id>
        <url>https://repo.rappytv.com/public</url>
    </repository>
    ```

=== ":octicons-file-code-16: Gradle (Kotlin DSL)"

    ```kotlin
    maven {
        name = "rappytv"
        url = uri("https://repo.rappytv.com/public")
    }
    ```

=== ":octicons-file-code-16: Gradle (Groovy)"

    ```groovy
    maven {
        name "rappytv"
        url "https://repo.rappytv.com/public"
    }
    ```

### Adding the dependency

???+ warning
    You need to replace `VERSION` with the version you want to use. This is the latest stable tag: <a href="https://github.com/Global-Tags/Java/tags" target="_blank" style="display: inline-flex;-ms-transform: translateY(25%);transform: translateY(25%);">![GitHub Release](https://img.shields.io/github/v/tag/Global-Tags/Java?label=%20)</a>

=== ":octicons-file-code-16: Maven"

    ```xml
    <dependencies>
      <dependency>
        <groupId>com.rappytv.globaltags</groupId>
        <artifactId>GlobalTagsJava</artifactId>
        <version>VERSION</version>
      </dependency>
    </dependencies>
    ```

=== ":octicons-file-code-16: Gradle (Kotlin DSL)"

    ```kotlin
    dependencies {
        compileOnly("com.rappytv.globaltags:GlobalTagsJava:VERSION")
    }
    ```

=== ":octicons-file-code-16: Gradle (Groovy)"

    ```groovy
    dependencies {
        compileOnly "com.rappytv.globaltags:GlobalTagsJava:VERSION"
    }
    ```

## Usage
To implement the wrapper, create a class that extends the `GlobalTagsAPI<T>` class. This will give you access to a wide range of methods to interact with the GlobalTags API, such as fetching player information, translating color codes, handling authentication, and more.

### Example Implementation
=== ":octicons-file-code-16: MyGlobalTagsAPI.java"
    ```java
    public class MyGlobalTagsAPI implements GlobalTagsAPI<String> { // (1)

        @Override
        public Agent getAgent() {
            return new Agent("MyMod", "v1.0.0", "1.21"); // (2)
        }

        @Override
        public String getLanguageCode() {
            return "en_us"; // (3)
        }

        @Override
        public String translateColorCodes(String input) {
            return input; // (4)
        }

        @Override
        public UUID getClientUUID() {
            return UUID.randomUUID(); // (5)
        }

        @Override
        public AuthProvider getAuthType() {
            return AuthProvider.YGGDRASIL; // (6)
        }

        @Override
        public String getAuthorization() {
            return "my-api-token"; // (7)
        }
    }
    ```

    1. The `T` generic in `GlobalTagsAPI<T>` represents the type used for colored text components. It allows flexibility in how you implement color formatting, whether as a simple `String`, a `TextComponent`, or another type. Please note that the `ApiHandler<T>` and the `PlayerInfo<T>` also need to use the same generic value as the `GlobalTagsAPI<T>`.
    2. 1. Argument - Wrapper name
        2. Argument - Wrapper version
        3. Argument - Minecraft version
    3. Send a language code to the api. If we have translations for this language, any api response will be localized. This method does not need to be overridden. Just remove it if you don't plan to implement localized responses.
    4. Here you can implement your logic to convert a string to a colored instance of your `T` class. For simplicity, this example returns the input as is.
    5. Return the current client's UUID. For simplicity, this example returns a random `UUID`.
    6. Here you can choose an authentication method. For this example we'll assume you use minecraft session token based authentication.
    7. Here you can return the current auth token of the client.

=== ":octicons-file-code-16: Main.java"
    ```java
    public class Main {
        
        private static GlobalTagsAPI<String> api;

        public static void main(String[] args) {
            // Create an instance of your implementation and save it in some kind of field or attribute
            api = new MyGlobalTagsAPI();

            // Fetch a player's tag data, cache it and print it out once resolved
            api.getCache().resolve(uuid, System.out::println);

            // Fetch the client's tag data, cache it and print it out once resolved (The client's uuid is the uuid specified in GlobalTagsAPI#getClientUUID)
            api.getCache().resolveSelf(System.out::println);

            // Fetch a player's tag data without caching it and print it out once resolved
            api.getApiHandler().getInfo(uuid, System.out::println);

            // Get a player's tag from the cache (or null if it's not in the cache)
            System.out.println(api.getCache().get(uuid).getTag());

            // Report a player and log the response message
            api.getApiHandler().reportPlayer(uuid, "Racism", (response) -> System.out.println(response.data()));

            // Get a player's ban reason (Note: This will only work on accounts with the GlobalTags admin permissions)
            PlayerInfo<String> info = api.getCache().get(uuid);
            System.out.println(info.isSuspended() ? info.getSuspension().getReason() : "The user is not banned."); // (1)

            // Clear the cache
            api.getCache().clear();

            // Renew the cache (2)
            api.getCache().renew();
        }
    }
    ```

    1. `Suspension#getReason` will **not** be null as long as `Suspension#isActive` is true
    2. Renewing the cache means refetching the tag data for every cached player without removing them from the cache.

Also, everything is documented with javadocs so everything should be pretty self-explanatory. If you have any questions don't hesitate to create a <a href="https://github.com/Global-Tags/Java/issues/new" target="_blank">new issue</a> or create a ticket on the <a href="https://globaltags.xyz/discord" target="_blank">Discord Server</a>.

## Caching

The wrapper comes with a built-in caching mechanism to minimize redundant API calls. By default, cached data is refreshed every 5 minutes and completely cleared every 30 minutes.

??? info "Custom cache intervals"
    You can customize the cache renewal and clearing intervals by creating your own `PlayerInfo.Cache<T>` instance using the constructor with the `options` parameter. After that, simply override the `GlobalTagsAPI#getCache` method to return your custom cache instance.

    Using the example from above it would look like this:

    ```java
    public class MyGlobalTagsAPI implements GlobalTagsAPI<String> {

        private final PlayerInfo.Cache<T> cache = new PlayerInfo.Cache<>(this, new PlayerInfo.Cache.Options() {
            @Override
            public long getCacheClearInterval() {
                // 10 minutes for example
                return 1000 * 60 * 10;
            }

            @Override
            public long getCacheRenewInterval() {
                // 2 minutes for example
                return 1000 * 60 * 2;
            }
        });

        @Override
        public Agent getAgent() {
            return new Agent("MyMod", "v1.0.0", "1.21");
        }

        @Override
        public String getLanguageCode() {
            return "en_us";
        }

        @Override
        public String translateColorCodes(String input) {
            return input;
        }

        @Override
        public UUID getClientUUID() {
            return UUID.randomUUID();
        }

        // Override the cache getter here
        @Override
        public PlayerInfo.Cache<T> getCache() {
            return cache;
        }

        @Override
        public AuthProvider getAuthType() {
            return AuthProvider.YGGDRASIL;
        }

        @Override
        public String getAuthorization() {
            return "my-api-token";
        }
    }
    ```

## Authentication
To authenticate with the API, you need to provide an authorization token or other credentials depending on the authentication method (`AuthProvider`).
To create an own auth mechanism for the API please read [this page](../api/custom-auth-provider.md).

## Examples
You can see production examples here:

- <a href="https://labymod.net/" target="_blank">LabyMod</a> Addon: [<a href="https://github.com/Global-Tags/LabyAddon/blob/master/api/src/main/java/com/rappytv/globaltags/api/GlobalTagAPI.java" target="_blank">GitHub</a>]