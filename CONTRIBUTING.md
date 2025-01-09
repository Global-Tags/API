# Contributing to GlobalTagsAPI

You can read about contributing to the GlobalTagsAPI [here](https://docs.globaltags.xyz/api/custom-auth-provider/)!

### Naming Conventions

Previously, this project did not enforce strict conventions, which may have resulted in some inconsistencies across the codebase, such as variations in naming styles or file organization. While we are now adopting these standardized conventions to maintain consistency and improve readability, you may still encounter older patterns that deviate from the new guidelines.

- **Translations**: Use `snake_case` for all keys in translation files.  
  _Example_: `welcome_message`, `error_invalid_input`.

- **Database Keys**: Always follow `snake_case` for all keys in the database.  
  _Example_: `user_id`, `created_at`.

- **TypeScript Classes**: Use `PascalCase` for class names.  
  _Example_: `UserManager`, `ApiService`.

- **Normal TypeScript Files**: Use `kebab-case` for file names.  
  _Example_: `user-manager.ts`, `api-service.ts`.

- **TypeScript Enum Values**: Use `Capitalcase` for enum values.  
  _Example_: `enum Role { Admin, User, Guest }`.

- **Database Enum Values**: Use `snake_case` for database enum values.  
  _Example_: `admin`, `regular_user`.

### Time Handling in the Database

- Always use mongodb date strings for time-related fields in the database instead of numeric timestamps.  
  _Example_: `"2025-01-09T12:34:56Z"` instead of `1673262896`.  