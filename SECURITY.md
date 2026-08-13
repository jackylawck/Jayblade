# Security Policy & Vulnerability Management

Aligned with **ISO/IEC 27001** information security principles.

## 1. Client-Side Security Controls
- **Content Security Policy (CSP)**: Enforces strict script and style origin checks.
- **Subresource Integrity (SRI)**: All CDN dependencies are locked with SHA-384 hashes.
- **XSS & Injection Protection**: UI input elements (such as player names and room IDs) undergo strict HTML escaping and sanitization.

## 2. Reporting a Vulnerability
If you discover a potential security issue, please contact the maintainer directly via GitHub Security Advisories or email. We aim to respond within 48 hours.
