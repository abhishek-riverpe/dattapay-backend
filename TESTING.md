## Testing Guide

This backend uses **Bun + Jest (ts-jest, ESM)** for route and middleware tests. Below is everything you need to run and understand the suite.

### What’s Covered
- **HTTP route tests**: user, wallet, transfer, zynk, address, webhook, external-accounts, teleport.
- **Middleware**: admin/auth guard behavior and response formatting.
- **Validation & business logic**: happy paths, error handling, edge cases (pagination limits, missing payloads, etc.).

### Tooling
- Runtime: **Bun**
- Test runner: **Jest** (ts-jest, ESM via `NODE_OPTIONS=--experimental-vm-modules`)
- Location: all specs in `tests/`
- Config: `jest.config.ts`

### Environment for Tests
`tests/setup.ts` seeds test-only env vars:
- `NODE_ENV=test`
- `ADMIN_TOKEN_SECRET=test-admin-secret`
- `CLERK_SECRET_KEY=test-clerk-secret`
- `TEST_USER_ID` / `TEST_USER_EMAIL`: deterministic user injected by auth middleware in test mode
- `BYPASS_AUTH_USER_LOOKUP=true`: skips “user not found” branches in auth-dependent suites (keeps tests focused on controllers/routes)

Auth/Admin middleware test-mode behavior:
- Admin: accepts any token except `"invalid-token"` when `NODE_ENV=test`.
- Auth: short-circuits external verification, rejects tokens containing `"invalid"`, and attaches a stub user using the test env vars above.

To exercise the real lookup paths, set `BYPASS_AUTH_USER_LOOKUP=false` and adjust mocks accordingly.

### How to Run
- **All tests** (preferred):
  ```bash
  bun run test
  ```
- **Single file** (faster debugging):
  ```bash
  bun run test -- tests/wallet.routes.test.ts --runInBand
  ```
- **Watch mode**:
  ```bash
  bun run test:watch
  ```
- **Clear Jest cache** (if mocks/config change and results look stale):
  ```bash
  bun run test -- --clearCache
  ```

### Notes & Tips
- Tests rely on Bun; ensure Bun is installed and you run commands from repo root.
- Jest is invoked with `NODE_OPTIONS='--experimental-vm-modules'` (already in package.json scripts).
- Routes often require both headers: `x-api-token` (admin) and `x-auth-token` (auth). Helpers in `tests/helpers/` set these for you.
- If you need to re-enable strict auth flows, flip `BYPASS_AUTH_USER_LOOKUP` and un-skip the guarded tests in middleware helpers/route suites.

### Troubleshooting
- Seeing “Cannot assign to read only property” for mocks: ensure you run via the provided scripts so ESM mocking works with ts-jest.
- Unexpected 401/403 in tests: confirm env vars from `tests/setup.ts` are applied and that you’re not overriding headers in custom requests.
- Slow or flaky run: try `--runInBand` for a single suite, or clear cache.

