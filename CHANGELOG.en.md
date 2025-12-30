# Changelog

[繁體中文](./CHANGELOG.md) | English

This file documents all notable changes to this project.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.1] - 2025-11-07

### Changed
- Refactor website update script to support full bilingual auto-update
  - Add auto-update functionality for README.md and README.zh-TW.md
  - Add auto-update functionality for website/locales/en.json and zh-TW.json
  - Improve index.html update logic with data-i18n attribute matching, remove hardcoded Chinese dependencies
  - Distinguish actual node count (from nodes.json) from output file count (from validation-report.json)
  - Centralize all update data management (node count, template count, version, date, file statistics)
  - Ensure English and Chinese content auto-sync, reducing maintenance overhead

## [1.2.0] - 2025-11-04

### Changed
- Implemented node layered merging strategy, significantly reducing output file count
- Optimized SKILL.md content for better Claude understanding and file searching

## [1.1.0] - 2025-11-03

### Added
- Complete open source project documentation (CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md)
- Added comprehensive project metadata in package.json
- Added prominent license notice in README.md
- Added copyright notices in source code

### Changed
- Adjusted GitHub Actions architecture: update workflow only updates source code, release workflow handles building
- .gitignore excludes data/ and output/ directories (build artifacts)

### Fixed
- Fixed workflow responsibility separation to avoid duplicate builds

## [1.0.0] - 2025-10-31

### Added
- Initial release
- Collect node information from n8n npm packages (540+ nodes)
- Collect usage statistics from n8n.io Templates API
- Priority ranking system (based on usage frequency, documentation completeness, community popularity)
- Category organizer (core, app, trigger, ai, database, utility)
- Node grouper (by functional groups and usage frequency)
- SKILL.md main file generator
- Resource file generator (resources/*.md)
- Validators (Skill format validation, completeness checking)
- Support for n8n v1.117.2

### GitHub Actions
- Auto-update workflow (weekly n8n update checks)
- Build validation workflow (runs on PR and push)
- Release workflow (auto-creates GitHub Release)

### Documentation
- Complete README.md
- LICENSE (MIT) and ATTRIBUTIONS.md (third-party license declarations)
- PROJECT_STATUS.md (project status report)
- CLAUDE.md (Claude Code development guide)
- Detailed documentation for each module (USAGE.md, ORGANIZERS_QUICKSTART.md, etc.)

### Technical
- TypeScript 5.3+ (strict mode)
- Modular design (collectors, parsers, organizers, generators, validators)
- Complete type definitions
- Jest testing framework
- ESLint code linting

---

## Version Guidelines

### Version Numbering Rules

- MAJOR: Incompatible API changes or n8n major version upgrade
- MINOR: Backward compatible feature additions or n8n minor version upgrade
- PATCH: Backward compatible bug fixes or data updates

### Tag Descriptions

- `Added`: New features
- `Changed`: Changes to existing functionality
- `Deprecated`: Features to be removed soon
- `Removed`: Removed features
- `Fixed`: Bug fixes
- `Security`: Security-related fixes
