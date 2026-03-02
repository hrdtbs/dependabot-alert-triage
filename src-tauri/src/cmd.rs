use crate::core_cmd;

#[tauri::command]
pub fn run_git(args: Vec<String>, current_dir: Option<String>) -> Result<String, String> {
    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    core_cmd::run_git(&args_ref, current_dir.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn run_gh(args: Vec<String>, current_dir: Option<String>) -> Result<String, String> {
    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    core_cmd::run_gh(&args_ref, current_dir.as_deref()).map_err(|e| e.to_string())
}
