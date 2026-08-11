# Unit Tests for build_database Function

This document describes the unit tests created for the [build_database](step1_schema.py) function in [step1_schema.py](step1_schema.py).

## Overview

The [build_database](step1_schema.py) function is responsible for creating a new SQLite database with the following characteristics:
- Creates a new database file at a specified path
- Does not overwrite existing files (raises `FileExistsError` if file exists)
- Creates parent directories if they don't exist
- Sets up PRAGMA settings for security
- Executes schema and seed SQL scripts
- Properly handles cleanup if errors occur during creation

## Test Suite

The test suite includes the following tests:

### 1. test_build_database_creates_new_db()
Verifies that the function creates a new database file with the correct schema and seeded data.

### 2. test_build_database_raises_error_if_exists()
Ensures that the function raises a `FileExistsError` when trying to create a database at an existing file path.

### 3. test_build_database_creates_parent_dirs()
Confirms that parent directories are created if they don't exist.

### 4. test_build_database_cleanup_on_error()
Tests that the function properly cleans up the database file if an error occurs during creation.

### 5. test_build_database_with_string_path()
Verifies that the function works correctly with both `Path` objects and string paths.

### 6. test_build_database_schema_structure()
Validates that the database has the correct table structure with all expected columns.

### 7. test_build_database_foreign_key_constraint()
Tests that foreign key constraints work correctly when explicitly enabled.

## Important Notes

- PRAGMA settings like `foreign_keys` and `trusted_schema` are session-specific and default to 0 in new connections.
- Foreign key constraints need to be explicitly enabled with `PRAGMA foreign_keys = ON` for each connection.
- The function properly handles file cleanup if errors occur during database creation.
- Parent directory creation is handled automatically with `mkdir(parents=True, exist_ok=True)`.

## Running the Tests

To run these tests, execute:

```bash
python -m pytest test_step1_schema.py -v
```

Or run the test file directly:

```bash
python test_step1_schema.py
```