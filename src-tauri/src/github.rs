use crate::core_github;
use crate::core_github::AuthStatus;

#[tauri::command]
pub fn check_gh_auth_status() -> Result<AuthStatus, String> {
    core_github::check_gh_auth_status().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fetch_user_organizations() -> Result<Vec<String>, String> {
    core_github::fetch_user_organizations().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fetch_user() -> Result<String, String> {
    core_github::fetch_user().map_err(|e| e.to_string())
}
