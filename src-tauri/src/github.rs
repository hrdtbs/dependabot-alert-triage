use crate::core_github;
use crate::core_github::AuthStatus;

#[tauri::command]
pub fn check_gh_auth_status() -> Result<AuthStatus, String> {
    core_github::check_gh_auth_status().map_err(|e| e.to_string())
}
