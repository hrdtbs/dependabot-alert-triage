use crate::core_cmd::{run_gh, run_git};
use anyhow::{Context, Result, anyhow};
use tauri::Manager;

/// Ensures that a repository is cloned locally.
/// If it doesn't exist, it performs a shallow clone.
/// If it exists, it fetches and resets to the latest commit.
/// Returns the absolute path to the cloned repository.
pub fn ensure_repo_cloned(app: &tauri::AppHandle, org: &str, repo: &str) -> Result<String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .context("Failed to get app data directory")?;

    let repos_dir = app_data_dir.join("repos");
    let org_dir = repos_dir.join(org);
    let repo_dir = org_dir.join(repo);

    if !org_dir.exists() {
        std::fs::create_dir_all(&org_dir).context("Failed to create org directory")?;
    }

    let repo_dir_str = repo_dir
        .to_str()
        .ok_or_else(|| anyhow!("Invalid path string"))?;

    if repo_dir.exists() {
        // Fetch the latest changes (shallow)
        run_git(&["fetch", "--depth", "1"], Some(repo_dir_str))
            .context("Failed to fetch repository")?;

        // Reset to FETCH_HEAD to update the working tree
        run_git(&["reset", "--hard", "FETCH_HEAD"], Some(repo_dir_str))
            .context("Failed to reset repository to FETCH_HEAD")?;
    } else {
        // Repository does not exist, clone it
        let repo_path_str = format!("{}/{}", org, repo);

        // gh repo clone <org>/<repo> <target_dir> -- --depth 1
        run_gh(
            &["repo", "clone", &repo_path_str, repo_dir_str, "--", "--depth", "1"],
            None,
        )
        .context("Failed to clone repository")?;
    }

    // Return the absolute path
    let absolute_path = std::fs::canonicalize(&repo_dir)
        .context("Failed to canonicalize repository path")?;

    let absolute_path_str = absolute_path
        .to_str()
        .ok_or_else(|| anyhow!("Invalid absolute path string"))?
        .to_string();

    Ok(absolute_path_str)
}
