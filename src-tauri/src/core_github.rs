use serde::{Deserialize, Serialize};
use std::process::Command;
use anyhow::{Result, Context};

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthStatus {
    pub logged_in: bool,
    pub scopes: Vec<String>,
    pub user: Option<String>,
}

pub fn check_gh_auth_status() -> Result<AuthStatus> {
    if Command::new("gh").arg("--version").output().is_err() {
        return Err(anyhow::anyhow!("GitHub CLI (gh) is not installed or not in PATH"));
    }

    let output = Command::new("gh")
        .args(&["api", "/", "--include"])
        .output()
        .context("Failed to execute gh command")?;

    if !output.status.success() {
        return Ok(AuthStatus {
            logged_in: false,
            scopes: vec![],
            user: None,
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut scopes = Vec::new();
    let logged_in = true;

    for line in stdout.lines() {
        if line.to_lowercase().starts_with("x-oauth-scopes:") {
            let parts: Vec<&str> = line.splitn(2, ':').collect();
            if parts.len() > 1 {
                scopes = parts[1].split(',')
                    .map(|s| s.trim().to_string())
                    .collect();
            }
        }
    }

    let user_output = Command::new("gh")
        .args(&["api", "user", "--jq", ".login"])
        .output();

    let user = if let Ok(out) = user_output {
        if out.status.success() {
             Some(String::from_utf8_lossy(&out.stdout).trim().to_string())
        } else {
            None
        }
    } else {
        None
    };

    Ok(AuthStatus {
        logged_in,
        scopes,
        user,
    })
}
