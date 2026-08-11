import os
import sqlite3
import tempfile
from pathlib import Path
import pytest
from unittest.mock import patch

# Import the function to be tested
from step1_schema import build_database


def test_build_database_creates_new_db():
    """Test that build_database creates a new database file successfully."""
    with tempfile.TemporaryDirectory() as temp_dir:
        db_path = Path(temp_dir) / "new_test.db"
        
        result_path = build_database(db_path)
        
        # Check that the returned path matches the input path
        assert result_path == db_path.resolve()
        
        # Check that the file exists
        assert db_path.exists()
        
        # Check that it's a valid SQLite database with expected tables and data
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        try:
            # Test that components table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='components';")
            assert len(cursor.fetchall()) == 1
            
            # Test that audit_events table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='audit_events';")
            assert len(cursor.fetchall()) == 1
            
            # Test that seed data was inserted
            cursor.execute("SELECT COUNT(*) FROM components;")
            count = cursor.fetchone()[0]
            assert count == 4  # Based on seed.sql
            # Test that the database works correctly (not testing PRAGMA as it's session-specific)
            
        finally:
            conn.close()


def test_build_database_raises_error_if_exists():
    """Test that build_database raises FileExistsError if file already exists."""
    with tempfile.TemporaryDirectory() as temp_dir:
        db_path = Path(temp_dir) / "existing_test.db"
        # Create the file first
        db_path.touch()
        
        # Verify file exists before calling function
        assert db_path.exists()
        
        # Call function and expect FileExistsError
        with pytest.raises(FileExistsError) as exc_info:
            build_database(db_path)
        
        # Check that the error message contains the expected text
        assert str(db_path) in str(exc_info.value)
        assert "уже существует" in str(exc_info.value)


def test_build_database_creates_parent_dirs():
    """Test that build_database creates parent directories if they don't exist."""
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create a nested path that doesn't exist yet
        nested_dir = Path(temp_dir) / "nested" / "path"
        db_path = nested_dir / "deep_test.db"
        
        result_path = build_database(db_path)
        
        # Check that the returned path matches the input path
        assert result_path == db_path.resolve()
        
        # Check that the file exists
        assert db_path.exists()
        
        # Check that parent directories were created
        assert nested_dir.exists()


def test_build_database_cleanup_on_error():
    """Test that build_database cleans up the file if an error occurs during creation."""
    # Mock the SQL file read operations to simulate an error
    with patch('pathlib.Path.read_text', side_effect=Exception("Simulated read error")):
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "error_test.db"
            
            # Call function and expect an exception
            with pytest.raises(Exception) as exc_info:
                build_database(db_path)
            
            # Verify the exception message
            assert "Simulated read error" in str(exc_info.value)
            
            # Check that the file was cleaned up (doesn't exist)
            assert not db_path.exists()


def test_build_database_with_string_path():
    """Test that build_database works with string path input."""
    with tempfile.TemporaryDirectory() as temp_dir:
        db_path_str = os.path.join(temp_dir, "string_path_test.db")
        
        result_path = build_database(db_path_str)
        
        # Check that the returned path is a resolved Path object
        expected_path = Path(db_path_str).resolve()
        assert result_path == expected_path
        
        # Check that the file exists
        assert Path(db_path_str).exists()




def test_build_database_schema_structure():
    """Test that the database has the correct schema structure."""
    with tempfile.TemporaryDirectory() as temp_dir:
        db_path = Path(temp_dir) / "schema_test.db"
        
        result_path = build_database(db_path)
        
        # Check that the file exists
        assert result_path.exists()
        
        # Connect and verify the schema
        conn = sqlite3.connect(result_path)
        cursor = conn.cursor()
        
        try:
            # Check components table structure
            cursor.execute("PRAGMA table_info(components)")
            columns = cursor.fetchall()
            column_names = [col[1] for col in columns]
            
            expected_columns = ['id', 'name', 'version', 'license_spdx', 'supplier', 'criticality', 'created_at']
            for col in expected_columns:
                assert col in column_names
            
            # Check audit_events table structure
            cursor.execute("PRAGMA table_info(audit_events)")
            audit_columns = cursor.fetchall()
            audit_column_names = [col[1] for col in audit_columns]
            
            expected_audit_columns = ['id', 'event_type', 'component_id', 'event_time']
            for col in expected_audit_columns:
                assert col in audit_column_names
                
            # Verify seed data
            cursor.execute("SELECT COUNT(*) FROM components;")
            count = cursor.fetchone()[0]
            assert count == 4  # Based on seed.sql
        finally:
            conn.close()


def test_build_database_foreign_key_constraint():
    """Test that foreign key constraints work when properly enabled."""
    with tempfile.TemporaryDirectory() as temp_dir:
        db_path = Path(temp_dir) / "fk_test.db"
        
        build_database(db_path)
        
        # Connect to the database and enable foreign keys explicitly
        conn = sqlite3.connect(db_path)
        conn.execute("PRAGMA foreign_keys = ON")  # Explicitly enable foreign keys
        cursor = conn.cursor()
        
        try:
            # Insert a component
            cursor.execute("""
                INSERT INTO components (name, version, license_spdx, supplier, criticality)
                VALUES (?, ?, ?, ?, ?)
            """, ("test-component", "1.0.0", "MIT", "Test Supplier", "medium"))
            component_id = cursor.lastrowid
            conn.commit()
            
            # Insert an audit event with the component ID (should work)
            cursor.execute("""
                INSERT INTO audit_events (event_type, component_id)
                VALUES (?, ?)
            """, ("component_added", component_id))
            conn.commit()
            
            # Try to insert an audit event with a non-existent component ID (should fail due to FK constraint)
            with pytest.raises(sqlite3.IntegrityError):
                cursor.execute("""
                    INSERT INTO audit_events (event_type, component_id)
                    VALUES (?, ?)
                """, ("component_added", 9999))  # Non-existent component ID
                conn.commit()
        finally:
            # На Windows одного conn.close() здесь недостаточно. Неудавшийся
            # INSERT оставляет незавершённый prepared statement, из-за чего
            # sqlite3_close() не отпускает файл, и TemporaryDirectory падает
            # с PermissionError при удалении каталога. Закрытие курсора и
            # откат транзакции снимают блокировку до закрытия соединения.
            cursor.close()
            conn.rollback()
            conn.close()


if __name__ == "__main__":
    pytest.main([__file__])