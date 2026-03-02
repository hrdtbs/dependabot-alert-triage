use serde::{Deserialize, Serialize};
use anyhow::{Result, Context, anyhow};
use std::sync::Mutex;
use rusqlite::Connection;
use crate::core_cmd::run_gh;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Alert {
    pub number: u64,
    pub state: String,
    pub dependency: Dependency,
    pub security_advisory: SecurityAdvisory,
    pub created_at: String,
    pub repository: Option<Repository>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Repository {
    pub name: String,
    pub full_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Dependency {
    pub package: Package,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Package {
    pub ecosystem: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SecurityAdvisory {
    pub ghsa_id: String,
    pub cve_id: Option<String>,
    pub summary: String,
    pub description: String,
    pub severity: String,
}

pub fn fetch_org_alerts(org: &str) -> Result<Vec<Alert>> {
    let endpoint = format!("/orgs/{}/dependabot/alerts", org);
    let output = run_gh(&["api", &endpoint, "--paginate"], None)?;
    if output.trim().is_empty() {
        return Ok(vec![]);
    }
    let alerts: Vec<Alert> = serde_json::from_str(&output)
        .context("Failed to parse organization alerts")?;
    Ok(alerts)
}

pub fn fetch_user_alerts(user: &str) -> Result<Vec<(String, Alert)>> {
    // Fetch user repos
    let endpoint = format!("users/{}/repos", user);
    let repos_output = run_gh(&["api", &endpoint, "--paginate", "--jq", ".[].name"], None)?;
    let repos: Vec<&str> = repos_output.lines().map(|s| s.trim()).filter(|s| !s.is_empty()).collect();

    let mut all_alerts = Vec::new();

    for repo in repos {
        let endpoint = format!("/repos/{}/{}/dependabot/alerts", user, repo);
        // We ignore errors on individual repos because Dependabot might not be enabled or user might lack access
        if let Ok(output) = run_gh(&["api", &endpoint, "--paginate"], None) {
            if !output.trim().is_empty() {
                if let Ok(alerts) = serde_json::from_str::<Vec<Alert>>(&output) {
                    for alert in alerts {
                        all_alerts.push((repo.to_string(), alert));
                    }
                }
            }
        }
    }

    Ok(all_alerts)
}

pub fn upsert_alerts(conn: &Connection, scope_name: &str, alerts_with_repo: &[(String, Alert)]) -> Result<()> {
    let mut stmt = conn.prepare(
        "INSERT OR REPLACE INTO alerts (id, repository, package_name, severity, state, created_at, data_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )?;

    for (repo_name, alert) in alerts_with_repo {
        // Ensure repository name includes the scope name so we can filter later, unless it already does.
        let full_repo_name = if repo_name.starts_with(&format!("{}/", scope_name)) {
            repo_name.clone()
        } else {
            format!("{}/{}", scope_name, repo_name)
        };
        let id = format!("{}-{}", full_repo_name, alert.number);
        let data_json = serde_json::to_string(alert)?;

        stmt.execute(rusqlite::params![
            id,
            full_repo_name,
            alert.dependency.package.name,
            alert.security_advisory.severity,
            alert.state,
            alert.created_at,
            data_json
        ])?;
    }

    // Update cache metadata
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH)?.as_secs() as i64;
    conn.execute(
        "INSERT OR REPLACE INTO cache_metadata (cache_key, last_fetched) VALUES (?, ?)",
        rusqlite::params![scope_name, now],
    )?;

    Ok(())
}

pub fn get_cached_alerts(conn: &Connection, scope_name: &str) -> Result<Vec<(String, Alert)>> {
    let mut stmt = conn.prepare("SELECT repository, data_json FROM alerts WHERE repository LIKE ?")?;

    // Match anything that starts with "scope_name/"
    let pattern = format!("{}/%", scope_name);

    let alert_iter = stmt.query_map([pattern], |row| {
        let repo: String = row.get(0)?;
        let json: String = row.get(1)?;
        Ok((repo, json))
    })?;

    let mut results = Vec::new();
    for item in alert_iter {
        let (repo, json) = item?;
        if let Ok(alert) = serde_json::from_str::<Alert>(&json) {
            results.push((repo, alert));
        }
    }

    Ok(results)
}
