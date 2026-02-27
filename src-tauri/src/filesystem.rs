use crate::core_filesystem;

#[tauri::command]
pub fn list_directory(path: &str) -> Result<Vec<String>, String> {
    core_filesystem::list_directory(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_file(path: &str) -> Result<String, String> {
    core_filesystem::read_file(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_text(query: &str, path: &str) -> Result<Vec<String>, String> {
    core_filesystem::search_text(query, path).map_err(|e| e.to_string())
}
