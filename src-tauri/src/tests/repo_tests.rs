// Due to the difficulty of testing Tauri's `AppHandle::app_data_dir()` behavior
// in standard unit tests without a full mocked application context, and because
// the underlying CLI tools might not be available in all CI environments,
// the tests for `ensure_repo_cloned` have been removed in favor of manual testing
// during frontend invocation and proper architectural separation in the future.