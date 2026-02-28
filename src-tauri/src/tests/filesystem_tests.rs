#[cfg(test)]
mod filesystem_tests {
    use crate::core_filesystem::{list_directory, read_file, search_text};
    use std::fs;
    use std::io::Write;
    use tempfile::tempdir;

    #[test]
    fn test_list_directory() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test_file.txt");
        let mut file = fs::File::create(&file_path).unwrap();
        writeln!(file, "Hello world").unwrap();

        let entries = list_directory(dir.path().to_str().unwrap()).unwrap();
        assert!(entries.contains(&"test_file.txt".to_string()));
    }

    #[test]
    fn test_read_file() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("read_me.txt");
        let mut file = fs::File::create(&file_path).unwrap();
        write!(file, "Content to read").unwrap();

        let content = read_file(file_path.to_str().unwrap()).unwrap();
        assert_eq!(content, "Content to read");
    }

    #[test]
    fn test_search_text() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("searchable.txt");
        let mut file = fs::File::create(&file_path).unwrap();
        write!(file, "This is a secret key").unwrap();

        let results = search_text("secret", dir.path().to_str().unwrap()).unwrap();
        assert!(!results.is_empty());
        assert!(results[0].contains("searchable.txt"));
    }

    #[test]
    fn test_security_check() {
        let result = list_directory("../");
        assert!(result.is_err());
        assert_eq!(result.err().unwrap().to_string(), "Invalid path: Directory traversal not allowed");
    }
}
