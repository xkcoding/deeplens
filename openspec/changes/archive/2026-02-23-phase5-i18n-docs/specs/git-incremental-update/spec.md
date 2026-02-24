## MODIFIED Requirements

### Requirement: Selective regeneration
The system SHALL invoke the Generator Agent for only the affected domains, passing a `domainFilter` parameter. The Generator Agent SHALL read the latest source code for affected domains and regenerate their Hub and Spoke documents, overwriting the previous versions in `<project>/.deeplens/docs/en/domains/<domain-id>/`. After regeneration, the system SHALL invoke the Translation Agent with the same `domainFilter` to translate only the affected domains' documents into Chinese under `<project>/.deeplens/docs/zh/domains/<domain-id>/`.

#### Scenario: Regenerate and translate single domain
- **WHEN** only the "authentication" domain is affected
- **THEN** the system calls `runGenerator` with `domainFilter: ["authentication"]`, then calls `runTranslator` with the same filter, regenerating and translating only `en/domains/authentication/` and `zh/domains/authentication/`

#### Scenario: Regenerate and translate multiple domains
- **WHEN** domains "authentication" and "data-access" are affected
- **THEN** both domains' English and Chinese docs are regenerated while all other domains' docs remain untouched

#### Scenario: Overview and summary re-translated
- **WHEN** any domain is regenerated during incremental update
- **THEN** the Overview and Summary are also re-generated in English and re-translated to Chinese, as they reference domain content

### Requirement: Index update
After regeneration and translation, the system SHALL delete old vector chunks for affected source paths using `VectorStore.deleteBySource()` and re-index the regenerated English documents. The system SHALL then update `<project>/.deeplens/last_analyzed_commit` to the current HEAD commit SHA. Chinese documents SHALL NOT be indexed in the vector store.

#### Scenario: Reindex after regeneration
- **WHEN** the "authentication" domain docs have been regenerated
- **THEN** old chunks for `en/domains/authentication/*.md` are deleted and new chunks are inserted into the vector store

#### Scenario: Chinese docs not indexed
- **WHEN** Chinese translations are written to `zh/domains/authentication/`
- **THEN** no vector store operations occur for the Chinese files

#### Scenario: Commit SHA updated
- **WHEN** incremental update completes successfully (including translation)
- **THEN** `<project>/.deeplens/last_analyzed_commit` contains the current HEAD commit SHA
