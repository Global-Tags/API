# FAQ

## General

### What do the different role icons mean?
| Icon | Role |
| ---- | ---- |
| ![Purple](https://cdn.rappytv.com/globaltags/icons/role/admin.png){ width=32 } | <p style="display: inline-flex;-ms-transform: translateY(25%);transform: translateY(25%);">Admin</p> |
| ![Purple](https://cdn.rappytv.com/globaltags/icons/role/developer.png){ width=32 } | <p style="display: inline-flex;-ms-transform: translateY(25%);transform: translateY(25%);">Developer</p> |
| ![Purple](https://cdn.rappytv.com/globaltags/icons/role/moderator.png){ width=32 } | <p style="display: inline-flex;-ms-transform: translateY(25%);transform: translateY(25%);">Discord Moderator</p> |
| ![Purple](https://cdn.rappytv.com/globaltags/icons/role/partner.png){ width=32 } | <p style="display: inline-flex;-ms-transform: translateY(25%);transform: translateY(25%);">Partner</p> |
| ![Purple](https://cdn.rappytv.com/globaltags/icons/role/supporter.png){ width=32 } | <p style="display: inline-flex;-ms-transform: translateY(25%);transform: translateY(25%);">GlobalTags Premium</p> |

### Which commands can I use?

There are several commands to help manage your settings. The main command is `/globaltags`, or you can use the shorthand `/gt`. Here are the available subcommands:

<div class="annotate" markdown>

- **`/gt`** (1) - Displays the current API and Agent versions.
    - **`/gt clearcache`** (2) – Instantly clears your cache.
    - **`/gt renewcache`** (3) – Manually renews the cache.
    - **`/gt link`** (4) – Links your Minecraft account to external connections.
        - **`discord`** - Begins the process to link your Minecraft account with your Discord. Join our <a href="https://globaltags.xyz/discord" target="_blank">Discord Server</a> to complete the connection.
        - **`email <address>`** - Adds an email to receive account-related updates. This is not a newsletter.
    - **`/gt unlink`** (5) – Removes external connections from your Minecraft account.
        - **`discord`** - Unlinks your Minecraft account from Discord.
        - **`email`** - Removes your email from the account.
    - **`/gt verify`** (6) - Verifies specific connections.
        - **`email <code>`** - Verifies your email by entering the confirmation code sent to your inbox.
        
</div>

1. **Base Command**:
    - Alias: `/globaltags`

2. **Clear Cache**: 
    - Alias: `/gt cc`

3. **Renew Cache**:
    - Aliases: `/gt renew`, `/gt rc`

4. **Link Connection**: 
    - No aliases

5. **Unlink Connection**: 
    - No aliases

6. **Verify Connection**: 
    - No aliases

## Tags

### How Can I Customize My Tag with Colors?

You can personalize your tag by using either Minecraft's default color codes or hex color codes. To apply a color, simply place the corresponding code before your text. Minecraft's default codes include numbers `0-9` for various colors and letters `a-f` for additional options, along with codes for text effects like bold or italic.

??? info "All Minecraft color codes"

    Here's a quick reference for Minecraft's color codes:

    - `0` - Black
    - `1` - Dark Blue
    - `2` - Dark Green
    - `3` - Dark Aqua
    - `4` - Dark Red
    - `5` - Dark Purple
    - `6` - Gold
    - `7` - Gray
    - `8` - Dark Gray
    - `9` - Blue
    - `a` - Green
    - `b` - Aqua
    - `c` - Red
    - `d` - Light Purple
    - `e` - Yellow
    - `f` - White
    - `k` - Obfuscated
    - `l` - Bold
    - `m` - Strikethrough
    - `n` - Underlined
    - `o` - Italic

If you'd like to use hex colors, use the format `<#HEXCODE>`. For example, `<#ff0000>` will create a bright red color. Remember, the brackets `< >` are essential for the color to be correctly applied.

Here is an example of applying such color or decoration codes:

=== ":material-tag-text: Tag"
    ```
    A &agreen &for <#ff0000>bright red&f, decorated <#ff0000>&o&l&nWord
    ```

=== ":material-image: Result"
    ![Colored tag](./assets/files/faq/colored_tag.png)

!!! Note
    Please refrain from putting spaces after color codes as this will create a whitespace which is a rule violation.

    Do - `&eExample`<br>
    Don't - `&e Example`

### Why can't I include certain words in my Tag?

Certain words, such as "LabyMod", are on a blocklist to prevent users from impersonating staff members. For example, setting your tag to something like `&f&lLABYMOD &cMOD` could closely mimic official staff tags. This blocklist helps maintain authenticity and prevents confusion among users.