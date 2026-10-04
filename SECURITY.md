# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 1.0.x | Yes |

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.**

Email **imzeesh.mughal1044@gmail.com** with:

- A description of the vulnerability and its impact
- Steps to reproduce, or a proof of concept
- The affected version, commit, or deployment
- Any suggested mitigation

## Disclosure policy

- You will receive an acknowledgement within **3 business days**.
- You will receive an assessment and expected remediation plan within **10
  business days**.
- We ask that you allow us **90 days** from acknowledgement to release a fix
  before disclosing the issue publicly.

If a fix cannot ship within 90 days, we will tell you why and how long we need.
We will credit you in the changelog and release notes unless you prefer to stay
anonymous.

## Scope

Camerlob processes files locally or on a self-hosted server. The following are in
scope:

- The conversion API routes under `app/api/`
- File upload validation, size limits, and MIME/extension handling
- Path traversal or arbitrary file read/write through uploaded filenames
- Server-side command injection in native engine invocations
- Temporary file handling and cleanup
- Any path where secrets or server-only environment variables leak to the
  browser bundle

Out of scope:

- Vulnerabilities in upstream dependencies with no demonstrated impact here —
  report those to the upstream project
- Issues requiring an already-compromised host
- Denial of service from deliberately oversized local uploads against your own
  self-hosted instance

## Handling uploaded files safely

If you self-host Camerlob, remember that untrusted files are converted by native
engines. Run the container as a non-root user, keep it off public networks where
possible, and apply your own resource limits.
