pub mod filesystem;
pub mod github;
pub mod cmd;
pub mod core_filesystem; // Expose core modules
pub mod core_github;
pub mod core_db;
pub mod core_cmd;

#[cfg(test)]
mod tests;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            filesystem::list_directory,
            filesystem::read_file,
            filesystem::search_text,
            github::check_gh_auth_status,
            cmd::run_git,
            cmd::run_gh,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
