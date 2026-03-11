use crate::core_repo;

#[tauri::command]
pub fn clone_repo(app: tauri::AppHandle, org: &str, repo: &str) -> Result<String, String> {
    core_repo::ensure_repo_cloned(&app, org, repo).map_err(|e| format!("Failed to clone repository: {}", e))
}
