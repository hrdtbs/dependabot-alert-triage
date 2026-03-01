use std::process::Command;
use anyhow::{Result, Context};

/// A secure wrapper around std::process::Command that only allows
/// execution of specific, pre-approved binaries ("git" and "gh").
pub struct SecureCommand {
    program: String,
    args: Vec<String>,
}

impl SecureCommand {
    /// Creates a new SecureCommand.
    /// Returns an error if the program is not in the allowed list.
    pub fn new(program: &str) -> Result<Self> {
        let allowed_programs = ["git", "gh"];

        if !allowed_programs.contains(&program) {
            return Err(anyhow::anyhow!("Unauthorized program: '{}' is not allowed. Only git and gh are permitted.", program));
        }

        Ok(Self {
            program: program.to_string(),
            args: Vec::new(),
        })
    }

    /// Adds a single argument to the command.
    pub fn arg<S: AsRef<str>>(&mut self, arg: S) -> &mut Self {
        self.args.push(arg.as_ref().to_string());
        self
    }

    /// Adds multiple arguments to the command.
    pub fn args<I, S>(&mut self, args: I) -> &mut Self
    where
        I: IntoIterator<Item = S>,
        S: AsRef<str>,
    {
        for arg in args {
            self.args.push(arg.as_ref().to_string());
        }
        self
    }

    /// Executes the command and returns the output.
    pub fn output(&self) -> Result<std::process::Output> {
        Command::new(&self.program)
            .args(&self.args)
            .output()
            .with_context(|| format!("Failed to execute command: {}", self.program))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_allowed_programs() {
        assert!(SecureCommand::new("git").is_ok());
        assert!(SecureCommand::new("gh").is_ok());
    }

    #[test]
    fn test_disallowed_programs() {
        assert!(SecureCommand::new("rm").is_err());
        assert!(SecureCommand::new("bash").is_err());
        assert!(SecureCommand::new("sh").is_err());
        assert!(SecureCommand::new("curl").is_err());
    }

    #[test]
    fn test_args_builder() {
        let mut cmd = SecureCommand::new("git").unwrap();
        cmd.arg("status").args(["--short", "-b"]);

        assert_eq!(cmd.program, "git");
        assert_eq!(cmd.args, vec!["status", "--short", "-b"]);
    }
}
