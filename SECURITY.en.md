# Security Policy

[繁體中文](./SECURITY.md) | English

## Supported Versions

Currently supported versions with security updates:

| Version | Support Status |
| --- | --- |
| 1.x.x | :white_check_mark: |
| < 1.0 | :x: |

## Reporting Security Vulnerabilities

We take security issues very seriously. If you discover a security vulnerability, please help us with responsible disclosure.

### Do Not Report Publicly

Please do not report security vulnerabilities in public GitHub Issues.

### How to Report

Please report security vulnerabilities privately through:

1. Use the [Security Advisories](https://github.com/haunchen/n8n-skill/security/advisories/new) feature on GitHub
2. Or contact project maintainers directly

### What to Include in Your Report

To help us understand and fix the issue faster, please include:

- Vulnerability type (e.g., XSS, SQL injection, remote code execution, etc.)
- Affected files and code locations
- Steps to reproduce the vulnerability
- Proof of Concept or example code
- Description of potential impact
- Suggested fixes (if any)

### Our Commitment

- Acknowledge receipt of your report within 48 hours
- Provide initial assessment within 7 days
- Fix the vulnerability within a reasonable timeframe
- Credit the reporter in Release Notes after the fix is published (if you wish)

## Security Best Practices

### Security Recommendations When Using This Project

1. Dependency Updates
   - Regularly run `npm audit` to check for known vulnerabilities
   - Keep dependency packages up to date
   - Subscribe to GitHub security notifications

2. Environment Security
   - Do not hardcode sensitive information in code
   - Use environment variables for configuration management
   - Ensure .env files are not committed to version control

3. Execution Environment
   - Use supported Node.js versions (>= 18.0.0)
   - Regularly update operating system and runtime environment
   - Limit project file system access permissions

## Known Security Considerations

### Dependency Packages

This project depends on n8n-related packages, which may have their own security considerations:

- n8n-workflow
- n8n-core
- n8n-nodes-base

Please refer to n8n's official security policy: https://docs.n8n.io/hosting/security/

### Data Processing

- This project loads n8n node classes from npm packages
- This project fetches public data from n8n.io API
- This project clones the n8n-docs Git repository

These operations are read-only and do not involve writing to external systems.

## License and Liability Disclaimer

- This project is provided "as is" without any express or implied warranties
- Users should assess security risks themselves
- This project is licensed under MIT License
- See [LICENSE](./LICENSE) file for details

## Security Update Subscriptions

To receive security update notifications:

1. Watch this project on GitHub
2. Select "Custom" → Check "Security alerts"
3. Subscribe to Release notifications

## Reference Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [npm Security](https://docs.npmjs.com/about-security-audits)
- [GitHub Security](https://docs.github.com/en/code-security)

Thank you for helping maintain the security of this project!
