# Alwaysdata deployment — 21 October 2026

## Public address

https://sigma-elms.alwaysdata.net/

The PHP 8.2 website runs on Alwaysdata with the MariaDB database `sigma-elms_db`.
The XAMPP installation remains separate and unchanged by hosting deployment.

## What was transferred

- An explicit allowlist of application files; no Git history, local cache, tests, backups, SQL dumps, private keys, or local credential JSON files.
- Clean table definitions, without sample rows.
- The owner's existing, identified master admin account, preserving its password hash, authenticator enrollment, and accepted terms.
- Existing service configuration, transferred privately over SSH and re-encrypted using a new hosting-only encryption key.
- One audit entry recording the real account transfer.

Other local user accounts and academic/browser records were not automatically imported. They require review before transfer. The hosting database is separate from localhost.

## Layout and credentials

- `/home/sigma-elms/www` points to the active release's `public` directory.
- `/home/sigma-elms/sigma-releases` retains versioned releases for rollback.
- `/home/sigma-elms/sigma-private/runtime.php` contains server environment configuration and the encryption key, outside the document root, readable only by the hosting user.
- The private storage directory persists across code deployments.
- Apache denies direct access to configuration, PHP includes, storage, and hidden files. Operational scripts and schemas are outside the document root.
- Alwaysdata's **Force HTTPS** setting belongs in Web → Sites → SSL. The provider terminates TLS at its proxy; an Apache `%{HTTPS}` rewrite can loop and must not be used here.

No runtime credentials belong in GitHub. The encrypted Actions deployment key is used only for SSH deployment; it is never included in a release archive.

## Deployment tools

- `scripts/build-hosting-release.py`: build a manifest-verified archive from an allowlist using the credential-free database template.
- `scripts/activate-hosting-release.py`: verify hashes and PHP syntax, verify database connectivity, then atomically switch website files. Regular deployments never import accounts or alter database rows.
- `scripts/initialize-hosting.php`: explicit first installation only; refuses an existing database.
- `scripts/export-hosting-owner.php` and `scripts/import-hosting-owner.php`: explicit CLI-only first-owner transfer. Not public API endpoints; the transport bundle stays outside the repository/document root.
- `.github/workflows/deploy-alwaysdata.yml`: deploy on pushes to `main` and by manual workflow dispatch. Requires repository Actions secrets `ALWAYSDATA_SSH_KEY` and `ALWAYSDATA_KNOWN_HOSTS`.

## Verification and remaining work

Verified over SSH: PHP 8.2 runtime and required extensions; database connectivity; 19 initial tables; one actual master account; empty subject catalogue; service-setting decryption. PHP files in the release passed syntax checks.

Verified over HTTPS: login/assets load; session and user APIs reject anonymous access; private configuration/includes/storage/Git files are inaccessible; operational scripts and schemas are not deployed publicly. Sigma Bot received a real Groq reply from the hosted server in a CLI connectivity check, without saving any chat, grade, or sample record.

This is a deployment checkpoint, not confirmation that every website feature is database-backed. The full persistence audit remains in `database-integration-audit-2026-10-21.md`. Submission evaluation, analytics, and AI-record routes still retain remote restrictions pending server-owned academic evidence and authorization. Do not remove those guards just to make hosting requests succeed. Full hosted login/2FA and feature acceptance require the account owner to use the public page. reCAPTCHA's allowed domain list may require adding the hosted hostname in Google's console.
