use serde::{Deserialize, Serialize};
use crate::core_process::SecureCommand;
use anyhow::{Result, Context};

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthStatus {
    pub logged_in: bool,
    pub scopes: Vec<String>,
    pub user: Option<String>,
    pub missing_scopes: Vec<String>,
    pub login_command: Option<String>,
}

pub fn check_gh_auth_status() -> Result<AuthStatus> {
    if SecureCommand::new("gh")?.arg("--version").output().is_err() {
        return Err(anyhow::anyhow!("GitHub CLI (gh) is not installed or not in PATH"));
    }

    let output = SecureCommand::new("gh")?
        .args(&["api", "/", "--include"])
        .output()
        .context("Failed to execute gh command")?;

    if !output.status.success() {
        let required_scopes = vec!["repo".to_string(), "read:org".to_string(), "security_events".to_string()];
        let login_command = format!("gh auth login --scopes {}", required_scopes.join(","));
        return Ok(AuthStatus {
            logged_in: false,
            scopes: vec![],
            user: None,
            missing_scopes: required_scopes,
            login_command: Some(login_command),
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut scopes: Vec<String> = Vec::new();
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

    let required_scopes = vec!["repo", "read:org", "security_events"];
    let mut missing_scopes = Vec::new();

    for req_scope in &required_scopes {
        if !scopes.contains(&req_scope.to_string()) {
            missing_scopes.push(req_scope.to_string());
        }
    }

    let login_command = if !missing_scopes.is_empty() {
        Some(format!("gh auth login --scopes {}", required_scopes.join(",")))
    } else {
        None
    };

    let user_output = SecureCommand::new("gh")?
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
        missing_scopes,
        login_command,
    })
}
