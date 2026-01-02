  ---
  🚨 CRITICAL FINDINGS (P0 - Immediate Action Required)

  1. Missing stripUnknown Enables Property Injection

  Location: All Joi validation calls in controllers
  Impact: Attackers can inject accountStatus: "ACTIVE" or zynkEntityId to bypass KYC

  // Current (vulnerable)
  const { error, value } = schema.validate(req.body, { abortEarly: false });

  // Fix
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });

  Affected Files:
  - controllers/user.controller.ts:60-61
  - controllers/address.controller.ts:28
  - controllers/transfer.controller.ts:14-15
  - controllers/wallet.controller.ts:31-32
  - All other controllers

  ---
  2. Webhook Payload Not Validated

  Location: routes/webhook.routes.ts:68
  Impact: Prototype pollution, type confusion attacks if webhook secret is compromised

  const body: KYCEvent = req.body;  // NO VALIDATION - direct cast

  Fix: Add Joi schema validation before processing webhook payload.

  ---
  3. Webhook Replay Attack Vulnerability

  Location: routes/webhook.routes.ts:23-47
  Impact: OLD valid webhooks can be replayed indefinitely

  // Timestamp extracted but NEVER validated for freshness
  const timestamp = match[1];
  // Missing: if (Date.now() - timestampMs > 5 * 60 * 1000) return false;

  Fix: Add timestamp freshness check (reject webhooks older than 5 minutes).

  ---
  4. Zynk API Responses Used Without Runtime Validation

  Location: Multiple service files
  Impact: Malformed/malicious Zynk API responses directly persisted to database

  // services/zynk.service.ts:67
  zynkEntityId: response.data.entityId,  // No validation!

  Fix: Add Zod or runtime validation for all external API responses.

  ---
  5. User Update Allows Auth-Critical Field Modification

  Location: schemas/user.schema.ts:121
  Impact: Account takeover by modifying clerkUserId or publicKey

  export type UpdateUserInput = Partial<CreateUserInput>;  // Includes publicKey!

  Fix: Create explicit restricted update schema excluding auth fields.

  ---
  🔴 HIGH FINDINGS (P1 - Fix Before Production)

  | #   | Finding                                                   | Location                         | Impact                            |
  |-----|-----------------------------------------------------------|----------------------------------|-----------------------------------|
  | 1   | Vulnerable qs dependency (CVSS 7.5)                       | package.json (indirect)          | DoS via memory exhaustion         |
  | 2   | Transfer amount schema allows integer overflow            | transfer.schema.ts:14-22         | Financial calculation errors      |
  | 3   | No Unicode/encoding sanitization on string fields         | user.schema.ts:10-50             | Homograph attacks, data integrity |
  | 4   | Wallet address format not validated                       | external-accounts.schema.ts:8-12 | Invalid addresses stored          |
  | 5   | executionId/signature lack format validation              | transfer.schema.ts:36-44         | Increased attack surface          |
  | 6   | User creation endpoint missing proper auth                | user.routes.ts:11                | Arbitrary user creation           |
  | 7   | Verbose error messages expose system state                | error.ts:16-17                   | Information disclosure            |
  | 8   | Missing environment variable validation                   | index.ts                         | Runtime failures, misconfig       |
  | 9   | JWT missing claims validation (iat, iss, aud)             | admin.ts:49-59                   | Token acceptance issues           |
  | 10  | JWT algorithm not verified from header                    | admin.ts:28-38                   | Algorithm confusion attacks       |
  | 11  | In-memory execution cache not suitable for multi-instance | transfer.service.ts:11-27        | Cache inconsistency               |
  | 12  | jest/supertest in production dependencies                 | package.json:44-47               | Increased attack surface          |

  ---
  🟡 MEDIUM FINDINGS (P2 - Plan for Sprint)

  | #   | Finding                                    | Location                     |
  |-----|--------------------------------------------|------------------------------|
  | 1   | Date of birth accepts future dates         | user.schema.ts:52-56         |
  | 2   | Phone number format not validated          | user.schema.ts:34-44         |
  | 3   | Query parameter type coercion risks        | wallet.controller.ts:107-118 |
  | 4   | getByClerkUserId lacks authorization       | user.controller.ts:42-55     |
  | 5   | console.error instead of structured logger | error.ts:16                  |
  | 6   | Incomplete .env.example documentation      | .env.example                 |
  | 7   | CORS allows null origin in production      | index.ts:59                  |
  | 8   | Development CORS patterns in production    | index.ts:50-54               |
  | 9   | Missing Content Security Policy            | index.ts (helmet config)     |
  | 10  | Database connection string no validation   | prisma-client.ts:5           |
  | 11  | Test environment bypass logic risk         | admin.ts:69-78               |
  | 12  | No request body size limit                 | index.ts:112-113             |
  | 13  | Logger not used consistently               | Various files                |
  | 14  | AppError class doesn't extend Error        | lib/AppError.ts              |

  ---
  🟢 LOW FINDINGS (P3 - Track in Backlog)

  | #   | Finding                                     | Location               |
  |-----|---------------------------------------------|------------------------|
  | 1   | Overly permissive email validation          | user.schema.ts:28-32   |
  | 2   | Clerk error message leakage                 | auth.ts:66-74          |
  | 3   | Inconsistent entity ID validation           | zynk-client.ts:44-57   |
  | 4   | Key generation uses library default PRNG    | crypto.ts:90-91        |
  | 5   | Port default mismatch (5000 vs 7000)        | index.ts:127           |
  | 6   | API key expiration 1 year (may be too long) | zynk.repository.ts:362 |

  ---
  ✅ Security Strengths Identified

  1. Timing-Safe Comparisons: All secret comparisons use crypto.timingSafeEqual()
  2. Rate Limiting: Comprehensive tiered limits (financial: 10/min, general: 100/15min)
  3. Security Headers: Helmet properly configured (HSTS, XSS, X-Frame-Options, etc.)
  4. Clerk Integration: Authentication delegated to established identity provider
  5. Prisma ORM: Parameterized queries prevent SQL injection
  6. URL Encoding: encodeURIComponent() used for Zynk API paths
  7. Graceful Shutdown: Proper connection cleanup on SIGTERM/SIGINT
  8. 30s Timeout: Zynk API calls have timeout configured
  9. Canonical Signatures: Crypto library prevents signature malleability
  10. UUID Primary Keys: Prevents enumeration attacks

  ---
  Risk Matrix Summary

  | OWASP Category                | Risk Level | Key Issue                          |
  |-------------------------------|------------|------------------------------------|
  | A01 Broken Access Control     | MEDIUM     | User creation auth gap             |
  | A02 Cryptographic Failures    | LOW        | Custom JWT (works correctly)       |
  | A03 Injection                 | PASS       | Prisma ORM + Joi validation        |
  | A04 Insecure Design           | MEDIUM     | In-memory cache for multi-instance |
  | A05 Security Misconfiguration | MEDIUM     | Missing env validation             |
  | A06 Vulnerable Components     | HIGH       | qs dependency CVE                  |
  | A07 Auth Failures             | LOW        | Test bypass properly guarded       |
  | A08 Data Integrity Failures   | PASS       | Timing-safe HMAC verification      |
  | A09 Logging Failures          | MEDIUM     | console.error usage                |
  | A10 SSRF                      | PASS       | Fixed API base URLs                |

  ---
  Conclusion: The DattaPay backend has solid foundational security (authentication, ORM, rate limiting, security headers), but requires immediate attention on input validation gaps (stripUnknown, webhook validation, replay protection) and dependency updates before production deployment.