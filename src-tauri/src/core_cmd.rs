use std::process::Command;
use anyhow::{Result, Context, anyhow};

/// Securely execute a git command.
/// The command executable is strictly "git".
pub fn run_git(args: &[&str], current_dir: Option<&str>) -> Result<String> {
    let mut cmd = Command::new("git");
    cmd.args(args);

    if let Some(dir) = current_dir {
        cmd.current_dir(dir);
    }

    let output = cmd.output().context("Failed to execute git command")?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow!("git command failed with status {}: {}", output.status, err));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Securely execute a gh command.
/// The command executable is strictly "gh".
pub fn run_gh(args: &[&str], current_dir: Option<&str>) -> Result<String> {
    let mut cmd = Command::new("gh");
    cmd.args(args);

    if let Some(dir) = current_dir {
        cmd.current_dir(dir);
    }

    let output = cmd.output().context("Failed to execute gh command")?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow!("gh command failed with status {}: {}", output.status, err));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
