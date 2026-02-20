## ADDED Requirements

### Requirement: Settings dialog
The application SHALL provide a settings dialog accessible from the header bar gear icon. The dialog SHALL be a modal overlay organized into tabs: "Claude API", "SiliconFlow", and "General". Changes SHALL be saved per-field on blur or explicit "Save" button click.

#### Scenario: Open settings dialog
- **WHEN** the user clicks the settings gear icon
- **THEN** a modal dialog opens with the "Claude API" tab active

#### Scenario: Switch settings tab
- **WHEN** the user clicks the "SiliconFlow" tab
- **THEN** the dialog shows SiliconFlow configuration fields

### Requirement: Claude API configuration
The "Claude API" tab SHALL provide the following fields:
- **API Base URL** (text input): Default `https://api.anthropic.com`. Editable to support Coding Plan proxies.
- **API Key** (password input): Required. Shown as masked dots with a reveal toggle.
- **Model** (dropdown): Options include `claude-sonnet-4-20250514`, `claude-opus-4-20250514`. Default: `claude-sonnet-4-20250514`.

#### Scenario: Configure Claude API endpoint
- **WHEN** the user enters a custom Base URL and API Key
- **THEN** subsequent Agent operations use the configured endpoint

#### Scenario: API Key masking
- **WHEN** the user views the API Key field
- **THEN** the value is displayed as dots with a toggle button to reveal the plaintext

#### Scenario: Missing required API Key
- **WHEN** the user clears the API Key field and tries to save
- **THEN** a validation error appears: "API Key is required"

### Requirement: SiliconFlow configuration
The "SiliconFlow" tab SHALL provide the following fields:
- **API Base URL** (text input): Default `https://api.siliconflow.cn/v1`.
- **API Key** (password input): Required for Q&A features.
- **Embedding Model** (dropdown): Options include `Qwen/Qwen3-Embedding-8B`, `BAAI/bge-m3`, `BAAI/bge-large-zh-v1.5`. Default: `Qwen/Qwen3-Embedding-8B`.
- **LLM Model** (dropdown): Options include `deepseek-ai/DeepSeek-V3`, `Qwen/Qwen2.5-72B-Instruct`. Default: `deepseek-ai/DeepSeek-V3`.

#### Scenario: Configure SiliconFlow
- **WHEN** the user sets the SiliconFlow API Key and selects an embedding model
- **THEN** subsequent indexing and search operations use the configured SiliconFlow settings

### Requirement: General configuration
The "General" tab SHALL provide the following fields:
- **Project Storage Path** (text input with folder picker): Default `<project>/.deeplens/`. Where docs and vector index are stored.
- **API Server Port** (number input): Default auto-detect. The Hono API listening port.
- **VitePress Port** (number input): Default auto-detect. The documentation preview port.

Port changes SHALL require application restart and display a notice: "Port changes require restart."

#### Scenario: Change storage path
- **WHEN** the user changes the project storage path
- **THEN** a warning is shown: "Existing data will not be moved. Re-run analysis for the new location."

#### Scenario: Port change notice
- **WHEN** the user changes the API server port
- **THEN** a notice appears: "Port changes require application restart"

### Requirement: Configuration persistence
All configuration values SHALL be persisted to a SQLite database at `~/.deeplens/global.db` in a `config` table with schema `(key TEXT PRIMARY KEY, value TEXT NOT NULL)`. Sensitive values (API Keys) SHALL be encrypted before storage using the Tauri shell's `encrypt_value` command. Non-sensitive values SHALL be stored as plaintext.

#### Scenario: Save and reload config
- **WHEN** the user sets an API Key and restarts the application
- **THEN** the API Key is loaded from encrypted storage and the settings dialog shows the masked value

#### Scenario: Config key naming
- **WHEN** configuration is persisted
- **THEN** keys use the naming convention: `anthropic.base_url`, `anthropic.api_key`, `anthropic.model`, `siliconflow.base_url`, `siliconflow.api_key`, `siliconflow.embed_model`, `siliconflow.llm_model`, `general.storage_path`, `general.api_port`, `general.docs_port`

### Requirement: First-launch setup flow
On first launch (no configuration in `~/.deeplens/global.db`), the application SHALL display a setup dialog that requires the user to enter at minimum the Claude API Key before proceeding. The setup dialog SHALL explain each required field. The user SHALL be able to skip SiliconFlow configuration (Q&A features will be unavailable).

#### Scenario: First launch setup
- **WHEN** the user launches DeepLens for the first time
- **THEN** a setup dialog appears with Claude API Key as required and SiliconFlow API Key as optional

#### Scenario: Skip SiliconFlow setup
- **WHEN** the user skips the SiliconFlow API Key during first launch
- **THEN** the application starts but Chat/Q&A features show "Configure SiliconFlow API in Settings to enable Q&A"

### Requirement: Configuration export and import
The settings dialog SHALL provide "Export" and "Import" buttons. Export SHALL save non-sensitive configuration (Base URLs, model selections, ports) to a JSON file. Import SHALL load configuration from a JSON file. API Keys SHALL NOT be included in exports.

#### Scenario: Export configuration
- **WHEN** the user clicks "Export"
- **THEN** a JSON file is downloaded containing all non-sensitive configuration values

#### Scenario: Import configuration
- **WHEN** the user clicks "Import" and selects a valid JSON file
- **THEN** the settings are updated with the imported values (API Keys remain unchanged)

### Requirement: Connection test
Each API configuration section SHALL provide a "Test Connection" button. For Claude API, it SHALL make a minimal API call to verify the key and endpoint. For SiliconFlow, it SHALL call the embedding endpoint with a test input. Results SHALL be displayed inline as success (green check) or failure (red X with error message).

#### Scenario: Successful connection test
- **WHEN** the user clicks "Test Connection" for Claude API with valid credentials
- **THEN** a green check mark appears with "Connection successful"

#### Scenario: Failed connection test
- **WHEN** the user clicks "Test Connection" with an invalid API key
- **THEN** a red X appears with the error message (e.g., "401 Unauthorized")
