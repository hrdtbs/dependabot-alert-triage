# 📄 Application Specification: Dependabot AI Triage (Tentative)

## 1. Application Overview

A desktop tool that consolidates GitHub Dependabot Alerts on an Organization/User basis, uses AI to perform autonomous codebase investigation (Agentic AI approach), and evaluates the "actual threat level (exploitability)" of vulnerabilities.
Developers can select multiple alerts deemed safe based on the AI's evaluation and dismiss (close) them in bulk, dramatically reducing the burden of triage work.

## 2. System Architecture & Tech Stack

*   **Architecture:** Lightweight desktop app using Tauri v2
*   **Frontend (Webview):** React, TypeScript, Vite
    *   UI Library: Tailwind CSS, shadcn/ui
    *   State Management & API Integration: TanStack Query
    *   AI Integration: Vercel AI SDK (`@ai-sdk/react` for Tool Calling and Streaming)
*   **Backend (Core):** Tauri (Rust)
    *   Command Execution: `std::process::Command` (calling `gh cli`, `git`)
    *   File Operations: `std::fs` (File reading/searching in response to AI requests)
    *   Local DB: SQLite (for local caching)
*   **External Integrations:**
    *   GitHub: `gh cli` (Authentication/Clone) / GitHub REST API (Bulk alert fetching/Dismissing)
    *   AI: Any LLM for which the user inputs an API key (OpenAI, Anthropic, Gemini, etc.)

## 3. Core Feature Requirements

### 3.1. Authentication and GitHub Access Control

*   **Delegation to `gh cli`:** Authentication is primarily handled by `gh cli`. Check `gh auth status` at app startup.
*   **Permission Verification & Dynamic Update:** Verify required scopes (`repo`, `read:org`, `security_events`) during API requests. If insufficient, guide the user via UI to run `gh auth login --scopes security_events`, allowing easy copy-paste for token updates.
*   **Fallback:** Provide a function for manual PAT (Personal Access Token) entry.

### 3.2. Scope Selection and Alert Listing (Optimized)

*   **Organization-level Fetching:** Use endpoints like `GET /orgs/{org}/dependabot/alerts` to efficiently fetch all alerts within a selected Organization (or User). Avoid API rate limits.
*   **Filtering and Sorting:** Enable local filtering by severity, repository, specific package names, etc.
*   **Local Cache:** Save fetch results to SQLite to achieve fast display on next startup and save API calls.

### 3.3. Autonomous Code Evaluation by AI (Agentic AI)

Evaluate by giving the AI "tools (permissions)" to explore the repository without prior data processing.

*   **On-demand Clone:**
    *   Only when a user executes "AI Evaluation", if the target repository is not cloned or is outdated, execute `gh repo clone <repo> -- --depth 1` (or `git fetch & reset`) in a temporary directory.
*   **Leveraging Vercel AI SDK (Tool Calling):**
    *   Provide the following tools (functions executed on the Rust side) to the AI:
        1.  `list_directory(path)`: Check file structure within a directory.
        2.  `read_file(path)`: Read the content of an arbitrary file (source code, `package-lock.json`, etc.).
        3.  `search_text(query, path)`: Search for specific strings (function calls, package names) within the repository.
*   **Evaluation Process:**
    *   The AI receives only "vulnerability information" and "root directory structure" as initial information, and autonomously calls tools to investigate dependencies and code usage.
    *   The investigation results and the conclusion on threat level (e.g., "Low threat because it is not directly called") are streamed to the UI.

### 3.4. Bulk Dismiss Functionality

*   **Multi-selection Processing:** A feature to select multiple alerts on the data grid and dismiss them in bulk.
*   **Automatic AI Evaluation Integration:** When dismissing alerts evaluated as "No Threat (Safe)" by AI, automatically insert the AI's evaluation reason as `dismissed_comment` and execute the API (`PATCH`) asynchronously in parallel to close with an appropriate reason (e.g., `not_used`).

## 4. User Workflow (Operation Scenario)

1.  **Initial Setup:** Launch the app and set the API key for the desired AI (OpenAI, etc.). GitHub authentication status (`gh cli`) is automatically checked.
2.  **Target Selection:** Select the own Organization from the left sidebar.
3.  **Triage Screen:** All Dependabot Alerts in the organization are listed. Filter by severity "Critical", "High".
4.  **Execute AI Evaluation:** Select the alert to investigate and press the "Evaluate with AI" button.
5.  **Autonomous AI Investigation:** The repository is shallowly cloned in the background, and the AI investigates the code using `search_text` and `read_file` tools. Its thought process and final threat level judgment are streamed to the panel on the right side of the screen.
6.  **Bulk Dismiss:** Check multiple alerts that the AI determined as "No impact on production environment" and press the "Bulk Dismiss" button. Alerts are closed on GitHub with the AI's comment attached.
