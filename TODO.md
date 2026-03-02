# 📝 Project Roadmap & TODOs

## Phase 1: Project Setup & Initialization

- [x] Initialize Tauri v2 project structure (Rust + React/TypeScript).
- [x] Configure Vite, Tailwind CSS, and shadcn/ui.
- [x] Set up linting and formatting (ESLint, Prettier, Rustfmt, Clippy).
- [x] Define project architecture (folder structure for frontend/backend).

## Phase 2: Backend Core (Rust)

- [ ] **Authentication Module:**
  - [x] Implement wrapper for `gh auth status` command.
  - [x] Implement logic to verify current scopes (`repo`, `read:org`, `security_events`).
  - [x] Handle missing scopes and generate `gh auth login` command strings for the user.
- [ ] **Data Persistence (SQLite):**
  - [x] Set up SQLite connection and schema migration strategy.
  - [x] Define tables for storing Alert data and Cache metadata.
- [ ] **File System & Command Execution:**
  - [x] Implement secure `std::process::Command` wrapper for `git` and `gh` operations.
  - [x] Implement `list_directory` command (Tool for AI).
  - [x] Implement `read_file` command (Tool for AI).
  - [x] Implement `search_text` command (Tool for AI - e.g., using `grep` or `ripgrep`).

## Phase 3: Frontend Foundation

- [x] **App Layout:**
  - [x] Create main shell with Sidebar (Org selection) and Main Content Area.
  - [x] Implement "Settings" view for AI API Key management.
- [x] **State Management:**
  - [x] Setup TanStack Query for data fetching and caching.
  - [x] specific stores (Zustand or Context) for User Auth state and UI state.

## Phase 4: Data Integration (GitHub API)

- [ ] **Organization & User Scope:**
  - [ ] Implement fetching logic for User's Organizations.
  - [ ] Create Sidebar UI for selecting the active scope.
- [ ] **Alerts Fetching:**
  - [ ] Implement `GET /orgs/{org}/dependabot/alerts` (handling pagination).
  - [ ] Store fetched alerts in SQLite cache.
  - [ ] Implement logic to display cached data immediately while refreshing in background.
- [ ] **Alert List UI:**
  - [ ] Create Data Grid for displaying alerts.
  - [ ] Add filtering (Severity, Package Name, Repo) and Sorting.

## Phase 5: AI Integration (Agentic Workflow)

- [ ] **Vercel AI SDK Setup:**
  - [ ] Configure `useChat` / `useCompletion` with custom API key support.
  - [ ] Bridge Frontend AI SDK tool calls to Backend Rust commands.
- [ ] **Repository Management:**
  - [ ] Implement "On-demand Shallow Clone" logic in Rust (check cache -> clone/fetch).
- [ ] **Agent Logic:**
  - [ ] Define the system prompt for the Triage Agent.
  - [ ] Connect `list_directory`, `read_file`, `search_text` tools to the Agent.
- [ ] **Evaluation UI:**
  - [ ] Create a split-pane or drawer for "AI Evaluation".
  - [ ] Display streaming thoughts/tool execution logs.
  - [ ] Render final verdict (Threat Level & Reasoning).

## Phase 6: Action & Bulk Operations

- [ ] **Bulk Dismiss Logic:**
  - [ ] Implement Multi-select state in the Alert Grid.
  - [ ] Create "Bulk Dismiss" UI action.
- [ ] **Dismiss API Integration:**
  - [ ] Implement `PATCH` request to dismiss alerts.
  - [ ] Logic to inject AI reasoning into the `dismissed_comment`.
  - [ ] Handle parallel execution and rate limiting.

## Phase 7: Polish & Distribution

- [ ] **Error Handling:**
  - [ ] Global error boundary and toast notifications.
  - [ ] Friendly error messages for network/auth failures.
- [ ] **Logging:**
  - [ ] Implement local logging for debugging.
- [ ] **Build & Release:**
  - [ ] Configure GitHub Actions for cross-platform build (macOS, Windows, Linux).
