pub mod filesystem;
pub mod github;
pub mod cmd;
pub mod core_filesystem; // Expose core modules
pub mod core_github;
pub mod core_db;
pub mod core_cmd;
pub mod core_alerts;
pub mod alerts;
pub mod core_repo;
pub mod repo;

#[cfg(test)]
mod tests;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
use std::sync::Mutex;

pub fn run() {
    // Initialize the DB
    let db_path = std::path::Path::new("app.db");
    let conn = core_db::init_db(db_path).expect("Failed to initialize database");

    tauri::Builder::default()
        .manage(Mutex::new(conn))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            filesystem::list_directory,
            filesystem::read_file,
            filesystem::search_text,
            github::check_gh_auth_status,
            github::fetch_user_organizations,
            github::fetch_user,
            cmd::run_git,
            cmd::run_gh,
            alerts::get_cached_alerts,
            alerts::sync_alerts,
            repo::clone_repo,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
