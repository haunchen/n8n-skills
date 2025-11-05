# n8n Skills

[English](README.en.md) | [繁體中文](README.md)

> Supported n8n version: v1.117.2

n8n workflow automation skill pack designed for AI assistants.

## Project Overview

This package provides AI assistants with the ability to access n8n node information, helping AI understand and operate n8n workflows.

### Key Features

- Provides complete information on n8n nodes
- Supports node search and exploration
- Node configuration validation
- Workflow structure analysis

### Technical Architecture

This project is built upon the [n8n-mcp](https://github.com/czlonkowski/n8n-mcp) architecture, converted into a Skill Pack generator with added priority ranking, node grouping, and documentation integration features.

## Using n8n Skills

This project generates n8n Skills, allowing you to use n8n workflow knowledge in Claude Code, Claude.ai, or Claude Desktop.

### Download Skill Pack

1. Go to the [GitHub Releases](https://github.com/haunc/n8n-skill/releases) page of this project
2. Download the latest version of the `n8n-skills-{version}.zip` file
3. After extraction, you will get the following file structure:
   ```
   n8n-skills/
   ├── Skill.md              # Main skill file
   └── resources/            # Detailed node documentation
       ├── input/            # Input category nodes
       ├── output/           # Output category nodes
       ├── transform/        # Transform category nodes
       ├── trigger/          # Trigger category nodes
       ├── organization/     # Organization category nodes
       └── misc/             # Miscellaneous nodes
   ```

### Installation Methods

Choose the installation method according to the Claude platform you are using:

#### Claude Code (CLI Tool)

Suitable for developers using Claude Code in the terminal.

1. Create a `.claude/skills/` directory in your project root:
   ```bash
   mkdir -p .claude/skills/n8n-skills
   ```

2. Copy the extracted `Skill.md` and `resources/` directory to that directory:
   ```bash
   cp -r n8n-skills/* .claude/skills/n8n-skills/
   ```

3. The directory structure should look like this:
   ```
   your-project/
   └── .claude/
       └── skills/
           └── n8n-skills/
               ├── Skill.md
               └── resources/
   ```

4. Verify installation: Ask Claude Code "List available n8n nodes". If the Skill is correctly invoked, the installation is successful.

#### Claude.ai Web (Web Version)

Suitable for general users in browsers.

1. Log in to [Claude.ai](https://claude.ai)
2. Go to the "Settings" page and find the "Capabilities" section
3. Click "Upload skill"
4. Select the downloaded `n8n-skills-{version}.zip` file to upload
5. After upload completes, you will see "n8n-skills" below. If not enabled, click to enable it.
6. Return to the conversation window and ask questions about n8n. Successfully using n8n-skills indicates successful installation.

#### Claude Desktop (Desktop Application)

Suitable for users of the Claude Desktop application.

1. Open the "Claude" desktop application
2. Go to the "Settings" page and find the "Capabilities" section
3. Find the "Skills" section and click "Upload skill"
4. Select the downloaded `n8n-skills-{version}.zip` file to upload
5. After upload completes, you will see "n8n-skills" below. If not enabled, click to enable it.
6. Return to the conversation window and ask questions about n8n. Successfully using n8n-skills indicates successful installation.

### Basic Usage Examples

After installation, you can use it like this:

Query specific node information:
```
"What are the main features of the HTTP Request node?"
"How to send email using the Gmail node?"
"What programming languages does the Code node support?"
```

Explore workflow patterns:
```
"How to create a scheduled workflow?"
"What are the common node combinations for data transformation?"
"How to handle API errors and retries?"
```

Search for specific functionality:
```
"Which nodes can connect to Google Sheets?"
"What AI-related nodes are available?"
"What trigger nodes are available?"
```

### FAQ

Skill won't load?

- Confirm the `Skill.md` file is in the correct location
- Check if the file name is correct (case-sensitive)
- Verify the `resources/` directory structure is complete
- Restart the Claude application or refresh the webpage

File structure errors

- Ensure `Skill.md` and `resources/` are in the same directory level
- Do not modify the file structure inside the `resources/` directory
- If there are multiple directory levels after extraction, move the contents to the correct location

Version compatibility

- Newer versions of n8n may have new nodes, but most features will still work
- It's recommended to regularly update the Skill Pack to get the latest node information

How to update to a new version

1. Download the latest version from GitHub Releases
2. Delete the old Skill files
3. Reinstall the new version following the installation steps
4. Restart the Claude application

### Reference Resources

- [Claude Skills Official Documentation](https://support.claude.com/en/articles/12580051-teach-claude-your-way-of-working-using-skills)
- [n8n Official Documentation](https://docs.n8n.io)
- [Issue Reporting](https://github.com/haunc/n8n-skill/issues)

## Development Environment Setup

```bash
npm install
```

## Development Commands

```bash
# Build project
npm run build

# Development mode
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck
```

## Technical Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.3.0

## Acknowledgments

This project was built using the following resources:

- Based on the [n8n-mcp](https://github.com/czlonkowski/n8n-mcp) project architecture created by Romuald Czlonkowski @ [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en)
- Uses n8n node type definitions and metadata
- References n8n official documentation

Thanks to all contributors and the open source community for their support.

## Related Links

- n8n Official Website: https://n8n.io
- n8n GitHub: https://github.com/n8n-io/n8n
- n8n Documentation: https://docs.n8n.io
- n8n-mcp Project: https://github.com/czlonkowski/n8n-mcp


## License Information

This project is licensed under the MIT License, but includes the following third-party resources:

1. n8n-mcp - n8n Model Context Protocol Integration
   - License: MIT License
   - Source: https://github.com/czlonkowski/n8n-mcp
   - Author: Romuald Czlonkowski @ www.aiadvisors.pl/en

For detailed license information, please refer to [ATTRIBUTIONS.md](./ATTRIBUTIONS.md) and [LICENSE](./LICENSE).

## License Terms

MIT License - See [LICENSE](./LICENSE) for details.

All trademarks and copyrights belong to their respective owners.
