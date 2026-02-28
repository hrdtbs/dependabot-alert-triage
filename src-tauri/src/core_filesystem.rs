use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;
use anyhow::{Result, Context};

// Basic security check to prevent directory traversal
fn is_safe_path(path: &str) -> bool {
    let p = Path::new(path);
    if p.components().any(|c| matches!(c, std::path::Component::ParentDir)) {
        return false;
    }
    true
}

pub fn list_directory(path: &str) -> Result<Vec<String>> {
    if !is_safe_path(path) {
        return Err(anyhow::anyhow!("Invalid path: Directory traversal not allowed"));
    }

    let mut entries = Vec::new();
    let read_dir = fs::read_dir(path).with_context(|| format!("Failed to read directory: {}", path))?;

    for entry in read_dir {
        let entry = entry?;
        let path = entry.path();
        let name = path.file_name().unwrap().to_string_lossy().to_string();
        let is_dir = path.is_dir();

        let display_name = if is_dir { format!("{}/", name) } else { name };
        entries.push(display_name);
    }

    entries.sort();
    Ok(entries)
}

pub fn read_file(path: &str) -> Result<String> {
    if !is_safe_path(path) {
        return Err(anyhow::anyhow!("Invalid path: Directory traversal not allowed"));
    }

    fs::read_to_string(path).with_context(|| format!("Failed to read file: {}", path))
}

pub fn search_text(query: &str, path: &str) -> Result<Vec<String>> {
    if !is_safe_path(path) {
        return Err(anyhow::anyhow!("Invalid path: Directory traversal not allowed"));
    }

    let mut results = Vec::new();

    for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let file_path = entry.path();
            if let Ok(content) = fs::read_to_string(file_path) {
                if content.contains(query) {
                    results.push(file_path.to_string_lossy().to_string());
                }
            }
        }
    }

    Ok(results)
}
