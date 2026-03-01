use rusqlite::{Connection, Result};
use std::path::Path;

pub fn init_db(db_path: &Path) -> Result<Connection> {
    let conn = Connection::open(db_path)?;

    // Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON;", ())?;

    // Create alerts table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS alerts (
            id TEXT PRIMARY KEY,
            repository TEXT NOT NULL,
            package_name TEXT NOT NULL,
            severity TEXT NOT NULL,
            state TEXT NOT NULL,
            created_at TEXT NOT NULL,
            data_json TEXT NOT NULL
        )",
        (),
    )?;

    // Create cache_metadata table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS cache_metadata (
            cache_key TEXT PRIMARY KEY,
            last_fetched INTEGER NOT NULL
        )",
        (),
    )?;

    Ok(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_init_db() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");

        let conn = init_db(&db_path).expect("Failed to initialize database");

        // Verify tables exist
        let mut stmt = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('alerts', 'cache_metadata')")
            .unwrap();

        let table_names: Vec<String> = stmt
            .query_map((), |row| row.get(0))
            .unwrap()
            .map(|name| name.unwrap())
            .collect();

        assert_eq!(table_names.len(), 2, "Expected 2 tables to be created");
        assert!(table_names.contains(&"alerts".to_string()));
        assert!(table_names.contains(&"cache_metadata".to_string()));
    }
}
