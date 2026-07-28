PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS components (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
        CHECK (length(trim(name)) BETWEEN 1 AND 100),
    version TEXT NOT NULL
        CHECK (length(trim(version)) BETWEEN 1 AND 50),
    license_spdx TEXT NOT NULL
        CHECK (length(trim(license_spdx)) BETWEEN 1 AND 80),
    supplier TEXT NOT NULL
        CHECK (length(trim(supplier)) BETWEEN 1 AND 120),
    criticality TEXT NOT NULL DEFAULT 'medium'
        CHECK (criticality IN ('low', 'medium', 'high')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (name, version, supplier)
) STRICT;
CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY,
    event_type TEXT NOT NULL
        CHECK (event_type IN ('component_added', 'license_changed')),
    component_id INTEGER NOT NULL,
    event_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (component_id) REFERENCES components(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) STRICT;
