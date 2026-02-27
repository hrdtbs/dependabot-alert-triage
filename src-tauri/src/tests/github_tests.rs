#[cfg(test)]
mod github_tests {
    use crate::core_github;

    #[test]
    fn test_check_gh_auth_status_missing_gh() {
        // In this environment, `gh` is missing, so we expect an error or a specific failure.
        // My implementation returns Err if `gh --version` fails.
        let result = core_github::check_gh_auth_status();

        // Assert that it returns an error and the error message mentions "not installed" or similar.
        assert!(result.is_err());
        let err_msg = result.err().unwrap().to_string();
        assert!(err_msg.contains("GitHub CLI (gh) is not installed"));
    }
}
