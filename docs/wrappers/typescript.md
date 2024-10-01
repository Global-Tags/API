# Typescript Wrapper

???+ danger
    This is subject to change. The Typescript wrapper will receive an update with a lot of breaking changes soon.

## Dependency installation
To use this wrapper in your JavaScript/TypeScript app, you can add it via the <a href="https://www.npmjs.com/package/globaltags.ts" target="_blank">npm registry</a>.

=== ":simple-npm: npm"
    ```sh
    npm i globaltags.ts
    ```

=== ":simple-bun: bun"
    ```sh
    bun i globaltags.ts
    ```

=== ":simple-pnpm: pnpm"
    ```sh
    pnpm add globaltags.ts
    ```

=== ":simple-yarn: yarn"
    ```sh
    yarn add globaltags.ts
    ```

### Imports
After adding the dependency you can import the actual API class like this:

=== ":simple-typescript: ES7"
    ```typescript
    import { GlobalTagAPI } from "globaltags.ts";
    ```
=== ":simple-javascript: CommonJS"
    ```javascript
    const { GlobalTagAPI } = require('globaltags.ts');
    ```

## Usage
To use the wrapper you only need to instantiate a new `GlobalTagAPI` object. You can then use `GlobalTagAPI#fetchPlayer` to fetch player data and receive an instance of the `Player` class.

```typescript
const api = new GlobalTagAPI(); // (1)

// Get a player instance from a specific player uuid
const player = await api.fetchPlayer('<UUID>', { token: '<YOUR API KEY>' }).catch(() => null);

if(!player) return;

// You can now interact with the player data.
console.log(player.tag || 'No Tag'); // (2)

player.setTag('The new tag :o', { token: 'current auth token' }); // (3)

player.appealBan('I want to apologize', { token: 'token' }); // (4)
```

1. If you want to use a custom instance of the api you need to pass an options object
2. Log the player's current tag if it exists.
3. Update the player's tag IF you have the admin permission to do so.
4. Appeal your ban if you were banned by an administrator.

### Contributing
If you find any bugs or have feature ideas feel free to create an <a href="https://github.com/Global-Tags/Typescript/issues/new" target="_blank">issue</a>.