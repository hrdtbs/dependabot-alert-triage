use crate::core_cmd::{run_git, run_gh};
use std::process::Command;

#[test]
fn test_run_git_version() {
    let result = run_git(&["--version"], None);
    assert!(result.is_ok());
    assert!(result.unwrap().starts_with("git version"));
}

#[test]
fn test_run_gh_version() {
    // Only run if gh is installed
    if Command::new("gh").arg("--version").output().is_ok() {
        let result = run_gh(&["--version"], None);
        assert!(result.is_ok());
        assert!(result.unwrap().contains("gh version"));
    }
}
