# Contributing Guide

[繁體中文](./CONTRIBUTING.md) | English

Thank you for considering contributing to the n8n Skill Pack project!

## Important Notice

Before contributing, please ensure you understand and agree to:

- This project's MIT License
- n8n's Sustainable Use License (applies when using n8n software)
- All contributions will be licensed under MIT License

## How to Contribute

### Reporting Issues

If you find a bug or have a feature suggestion:

1. Search existing Issues first to ensure the issue hasn't been reported
2. Create a new Issue with:
   - Clear title
   - Detailed problem description or feature request
   - Steps to reproduce (if it's a bug)
   - Expected vs. actual behavior
   - Your environment information (Node.js version, OS, etc.)

### Submitting Code (Pull Requests)

1. Fork this project to your GitHub account
2. Clone your fork locally
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Make changes and ensure:
   - Code follows project style
   - All tests pass: `npm test`
   - Type checking passes: `npm run typecheck`
   - Lint checking passes: `npm run lint`
5. Commit your changes: `git commit -m "Describe your changes"`
6. Push to your fork: `git push origin feature/your-feature-name`
7. Create a Pull Request on GitHub

### Pull Request Guidelines

- PR title should clearly describe the changes
- In the PR description, explain:
  - Motivation and purpose of the changes
  - Main technical implementation approach
  - Related Issue numbers (if any)
- Ensure all CI checks pass
- Keep PR scope reasonable, avoid overly large changes
- Respond to code review suggestions

## Development Environment Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### Installation Steps

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/n8n-skill.git
cd n8n-skill

# Install dependencies
npm install

# Build project
npm run build

# Run tests
npm test
```

### Development Workflow

```bash
# Development mode (watch mode)
npm run dev

# Type checking
npm run typecheck

# Lint checking
npm run lint

# Run full build
npm run build:full

# Validate output
npm run validate
```

## Code Style

This project uses the following tools to maintain code quality:

- TypeScript (strict mode)
- ESLint
- Prettier (if configured)

Please ensure your code:
- Follows TypeScript strict mode conventions
- Passes ESLint checks
- Has appropriate comments explaining complex logic
- Uses clear and meaningful function and variable names

## Testing

- New features should include tests
- Bug fixes should include tests to prevent regression
- Run `npm test` to ensure all tests pass
- Test coverage can be checked with `npm run test:coverage`

## Commit Message Guidelines

We recommend using clear commit messages:

```
type: Brief description (under 50 characters)

More detailed explanation (if needed)
- Explain the reason for changes
- Explain the impact scope
- Related Issue numbers

Closes #123
```

Type examples:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation updates
- `style`: Code formatting adjustments
- `refactor`: Refactoring
- `test`: Test-related
- `chore`: Build tools or auxiliary tool changes

## Project Architecture

Please refer to the following documents to understand the project architecture:

- `CLAUDE.md` - Claude Code development guide
- `PROJECT_STATUS.md` - Project status report
- `README.md` - Project overview

Main directory structure:

```
src/
├── collectors/    # Data collectors
├── parsers/       # Data parsers
├── organizers/    # Data organizers
├── generators/    # File generators
├── validators/    # Validators
└── utils/         # Utility functions
```

## License

By submitting a contribution, you agree that your code will be licensed under the MIT License.

All contributors must adhere to the project's Code of Conduct (CODE_OF_CONDUCT.md).

## Need Help?

If you have any questions:

- Create an Issue to ask
- Check existing documentation and code comments
- Refer to n8n official documentation: https://docs.n8n.io

Thank you for your contribution!
