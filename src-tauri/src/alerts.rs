use tauri::{command, State};
use std::sync::Mutex;
use rusqlite::Connection;
use crate::core_alerts::{self, Alert};

#[command]
pub fn get_cached_alerts(
    state: State<'_, Mutex<Connection>>,
    scope_name: String
) -> Result<Vec<(String, Alert)>, String> {
    let conn = state.lock().map_err(|e| e.to_string())?;
    core_alerts::get_cached_alerts(&conn, &scope_name).map_err(|e| e.to_string())
}

#[command]
pub async fn sync_alerts(
    state: State<'_, Mutex<Connection>>,
    scope_type: String,
    scope_name: String
) -> Result<(), String> {
    // 1. Fetch data from Github
    let fetched_data = if scope_type == "org" {
        let alerts = core_alerts::fetch_org_alerts(&scope_name).map_err(|e| e.to_string())?;
        alerts.into_iter().map(|a| {
            let repo_name = a.repository.as_ref().map(|r| r.name.clone()).unwrap_or_else(|| "unknown".to_string());
            (repo_name, a)
        }).collect()
    } else if scope_type == "user" {
        core_alerts::fetch_user_alerts(&scope_name).map_err(|e| e.to_string())?
    } else {
        return Err("Invalid scope_type".to_string());
    };

    // 2. Upsert into database
    let conn = state.lock().map_err(|e| e.to_string())?;
    core_alerts::upsert_alerts(&conn, &scope_name, &fetched_data).map_err(|e| e.to_string())?;

    Ok(())
}
