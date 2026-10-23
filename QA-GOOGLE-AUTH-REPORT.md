# Google Sign-In QA Report

**Execution date:** 2026-10-23  
**Environment:** Local development website at `http://127.0.0.1:5173/`; Flask API at `http://127.0.0.1:5000/`  
**Scope:** Existing Google Sign-In implementation, if present; no real Google account or credential was used.

## Executive Summary

The requested Google Sign-In feature is **not implemented in the inspected application**. The login screen exposes email/password login and a demo login, but no Google Sign-In control. The frontend dependency manifest contains no Google OAuth/Firebase authentication provider; the backend has no OAuth routes or Google client configuration. Direct requests to `/api/auth/google` and `/api/auth/google/callback` returned HTTP 404.

Accordingly, successful or adversarial Google authentication flows cannot be tested without first implementing and configuring the feature. No simulated Google login was added. The only observed defects are the missing Google Sign-In UI, API flow, and provider configuration; they share one root cause and one defect reference.

## Results

| Measure | Count |
|---|---:|
| Total Google-authentication test cases | 39 |
| Executed (PASS + FAIL) | 5 |
| Passed | 2 |
| Failed | 3 |
| Blocked | 34 |
| Not run | 0 |

Blocked cases were assessed but could not be executed because the Google authentication provider and its configuration do not exist. No Google credentials or provider responses were available. “Not run” is zero because each listed case was either executed against the available app or explicitly blocked at assessment.

## Findings

### GMAIL-DEF-001 — Google Sign-In is not implemented

- **Severity:** High
- **Priority:** P1
- **Impact:** Users cannot use Google Sign-In; the requested authentication flow and its security properties are unavailable.
- **Evidence:** No Google/Firebase authentication client, SDK dependency, Google OAuth environment setting, frontend sign-in control, or backend OAuth callback was found. The login page displayed only the existing email/password flow and demo-login control. Requests to `POST /api/auth/google` and `GET /api/auth/google/callback` returned 404.
- **Reproduction:** Open `/login`; observe there is no Google Sign-In button. Send the two API requests above; each returns `{"error":"Not found"}` with HTTP 404.
- **Root cause:** There is no Google OAuth implementation or configured provider/client.
- **Fix status:** Not fixed. Implementing OAuth without an approved Google OAuth client, authorized redirect URI, and project decision on identity linking would require inventing provider setup and cannot be verified safely here. No fake login or bypass was introduced.
- **Release recommendation:** Do not describe Google Sign-In as available or release it as a supported feature until implemented, configured, and its end-to-end cases pass.

## Master Test Cases

### GMAIL_TC_001 — Identify configured Google authentication provider
- Test Case ID: GMAIL_TC_001
- Module: Gmail / Google Authentication
- Test Scenario: Determine whether the project configures Google OAuth or Firebase Authentication.
- Preconditions: Repository and local backend are available.
- Test Data: None; source and configuration inspection only.
- Test Steps: 1. Search frontend dependencies, backend routes, configuration, and environment templates for Google OAuth/Firebase authentication. 2. Inspect backend integration status.
- Expected Result: A documented provider and non-secret client configuration mechanism are present.
- Actual Result: No provider implementation or Google client configuration was found; `/api/status` listed only Gemini, SMS, routing, and places integrations.
- Status: FAIL
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: A missing feature is confirmed; no credentials were exposed or requested.

### GMAIL_TC_002 — Verify Google Sign-In control is visible
- Test Case ID: GMAIL_TC_002
- Module: Gmail / Google Authentication
- Test Scenario: Check whether the login page presents a Google Sign-In option.
- Preconditions: Local website is running.
- Test Data: Login page at `/login`.
- Test Steps: 1. Open `/login` in the integrated browser. 2. Inspect the rendered login controls.
- Expected Result: One clearly labeled, accessible Google Sign-In control is visible.
- Actual Result: The page showed citizen/police portal controls, demo login, and email/mobile plus password fields; no Google control was present.
- Status: FAIL
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: Observed in the live local browser page.

### GMAIL_TC_003 — Verify Google OAuth API and callback routes
- Test Case ID: GMAIL_TC_003
- Module: Gmail / Google Authentication
- Test Scenario: Confirm backend exposes the Google authentication start and callback endpoints.
- Preconditions: Local backend is running.
- Test Data: `POST /api/auth/google`; `GET /api/auth/google/callback`.
- Test Steps: 1. POST to `/api/auth/google`. 2. GET `/api/auth/google/callback`. 3. Record HTTP status and response.
- Expected Result: The documented OAuth endpoints are registered and reject malformed requests safely.
- Actual Result: Both endpoints returned HTTP 404 with `{"error":"Not found"}`.
- Status: FAIL
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: No OAuth start or callback route is implemented.

### GMAIL_TC_004 — Authenticate a valid Google account
- Test Case ID: GMAIL_TC_004
- Module: Gmail / Google Authentication
- Test Scenario: Complete Google Sign-In with an authorized test account.
- Preconditions: A Google OAuth implementation, authorized client, redirect URI, and approved test account exist.
- Test Data: Authorized test account; credentials must remain in the approved secret manager.
- Test Steps: 1. Start Google Sign-In. 2. Complete Google consent and authentication. 3. Return to the application.
- Expected Result: The backend validates the Google response and establishes the intended application session.
- Actual Result: Google authentication could not be started because the control and provider routes are absent.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: No real account was used; do not infer successful authentication.

### GMAIL_TC_005 — Redirect after successful Google authentication
- Test Case ID: GMAIL_TC_005
- Module: Gmail / Google Authentication
- Test Scenario: Verify successful authentication redirects a citizen to the correct dashboard.
- Preconditions: A valid Google authentication flow and a citizen test account exist.
- Test Data: Authorized citizen test account.
- Test Steps: 1. Authenticate through Google. 2. Observe the final application URL and authenticated user view.
- Expected Result: The user lands on `/dashboard` with authenticated identity state.
- Actual Result: No Google authentication flow exists, so the redirect could not be exercised.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: Existing password-login navigation is outside this Google-specific test.

### GMAIL_TC_006 — Create an account on first Google login
- Test Case ID: GMAIL_TC_006
- Module: Gmail / Google Authentication
- Test Scenario: Verify first-time Google identity handling and account creation.
- Preconditions: Google OAuth and a dedicated, authorized first-login test identity exist.
- Test Data: Dedicated test identity with no existing application account.
- Test Steps: 1. Authenticate the identity for the first time. 2. Inspect the resulting user record and response.
- Expected Result: Exactly one account is created using verified provider claims and the documented account policy.
- Actual Result: The Google flow and first-login account policy are absent.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: No test record was created.

### GMAIL_TC_007 — Authenticate a returning Google user
- Test Case ID: GMAIL_TC_007
- Module: Gmail / Google Authentication
- Test Scenario: Verify repeat authentication for an already linked Google identity.
- Preconditions: A Google provider and an existing linked test identity exist.
- Test Data: Previously linked dedicated test identity.
- Test Steps: 1. Authenticate the identity. 2. Compare the returned application account with the linked account.
- Expected Result: The existing account is returned; no duplicate user record is created.
- Actual Result: Returning Google authentication could not be attempted.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: No Google identity records exist to compare.

### GMAIL_TC_008 — Link an existing password account to Google
- Test Case ID: GMAIL_TC_008
- Module: Gmail / Google Authentication
- Test Scenario: Verify the documented policy for linking an existing account.
- Preconditions: OAuth implementation and an existing account with an approved linking policy exist.
- Test Data: Dedicated account and a Google identity controlled by the tester.
- Test Steps: 1. Start Google account linking while authenticated to the existing account. 2. Complete provider consent. 3. Inspect linked identifiers.
- Expected Result: Linking occurs only through the documented, verified-account flow; unrelated accounts are not merged.
- Actual Result: No account-linking flow or policy was found.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: No account was linked or modified.

### GMAIL_TC_009 — Cancel Google authentication
- Test Case ID: GMAIL_TC_009
- Module: Gmail / Google Authentication
- Test Scenario: Verify cancellation from the Google consent/authentication screen.
- Preconditions: Google Sign-In and an authorized test account are available.
- Test Data: Test account; cancel action only.
- Test Steps: 1. Start Google Sign-In. 2. Cancel at the provider screen. 3. Observe the application state.
- Expected Result: The user remains unauthenticated, receives a clear non-sensitive message, and no account is created.
- Actual Result: There is no provider flow to cancel.
- Status: BLOCKED
- Severity: Medium
- Priority: P2
- Defect ID: GMAIL-DEF-001
- Remarks: No simulated cancellation was used.

### GMAIL_TC_010 — Close the Google authentication popup
- Test Case ID: GMAIL_TC_010
- Module: Gmail / Google Authentication
- Test Scenario: Verify behavior when the user closes an OAuth popup.
- Preconditions: The implementation uses a popup-based Google flow.
- Test Data: Dedicated test browser session.
- Test Steps: 1. Open the Google authentication popup. 2. Close it without completing consent. 3. Observe page state and errors.
- Expected Result: The application remains usable, unauthenticated, and reports cancellation once.
- Actual Result: No Google popup flow exists.
- Status: BLOCKED
- Severity: Medium
- Priority: P2
- Defect ID: GMAIL-DEF-001
- Remarks: Popup behavior cannot be inferred from the password form.

### GMAIL_TC_011 — Handle Google provider authentication failure
- Test Case ID: GMAIL_TC_011
- Module: Gmail / Google Authentication
- Test Scenario: Verify safe handling of a provider-side authentication failure.
- Preconditions: Google OAuth flow and an isolated provider test setup are available.
- Test Data: Provider-generated failure response; no real credentials.
- Test Steps: 1. Trigger an authorized provider failure condition. 2. Return to the application. 3. Inspect user state and message.
- Expected Result: No session is created; the user sees a safe actionable error with no sensitive details.
- Actual Result: No provider flow or failure handler exists.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: A production provider failure was not induced.

### GMAIL_TC_012 — Handle OAuth callback error parameters
- Test Case ID: GMAIL_TC_012
- Module: Gmail / Google Authentication
- Test Scenario: Verify callback behavior for provider error responses.
- Preconditions: A registered OAuth callback handler exists.
- Test Data: Synthetic `error` callback parameter in an isolated test environment.
- Test Steps: 1. Open the registered callback with a provider error. 2. Inspect response, navigation, and session state.
- Expected Result: The callback rejects the flow safely and does not establish a session.
- Actual Result: No callback handler exists; the frontend unknown-route behavior is covered separately in GMAIL_TC_018.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: A frontend fallback is not an OAuth callback implementation.

### GMAIL_TC_013 — Reject an invalid or unconfigured Google client
- Test Case ID: GMAIL_TC_013
- Module: Gmail / Google Authentication
- Test Scenario: Verify safe behavior when the Google client ID is missing or invalid.
- Preconditions: OAuth client configuration and an isolated invalid-client test environment exist.
- Test Data: Deliberately invalid test client ID; no secret.
- Test Steps: 1. Start Google Sign-In with the isolated invalid configuration. 2. Observe browser and backend errors.
- Expected Result: Authentication fails safely with no session, secret disclosure, or server traceback.
- Actual Result: No Google client ID setting or OAuth client exists.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: No invalid client value was added to application configuration.

### GMAIL_TC_014 — Establish Google-authenticated application session
- Test Case ID: GMAIL_TC_014
- Module: Gmail / Google Authentication
- Test Scenario: Verify trusted backend session creation from a validated Google identity.
- Preconditions: OAuth callback and backend identity validation are implemented.
- Test Data: Provider-issued test identity.
- Test Steps: 1. Complete Google authentication. 2. Inspect the session and `/auth/me` identity. 3. Confirm claims map to the intended local user.
- Expected Result: Only a validated identity creates the intended application session.
- Actual Result: No Google session-creation path exists.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: Existing password JWT behavior does not prove Google session behavior.

### GMAIL_TC_015 — Log out and authenticate again with Google
- Test Case ID: GMAIL_TC_015
- Module: Gmail / Google Authentication
- Test Scenario: Verify Google login remains usable after application logout.
- Preconditions: Google login and logout flows are implemented.
- Test Data: Dedicated linked Google test identity.
- Test Steps: 1. Authenticate with Google. 2. Log out. 3. Start Google Sign-In again.
- Expected Result: Logout clears application authentication; a new explicit Google authentication establishes a new session.
- Actual Result: Google login is absent; the Google re-authentication sequence could not be exercised.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: Existing password logout was not treated as proof of Google logout.

### GMAIL_TC_016 — Refresh after Google authentication
- Test Case ID: GMAIL_TC_016
- Module: Gmail / Google Authentication
- Test Scenario: Verify refresh behavior for an authenticated Google user.
- Preconditions: Google login and defined application session persistence are implemented.
- Test Data: Dedicated authenticated Google session.
- Test Steps: 1. Authenticate. 2. Refresh the dashboard. 3. Observe identity and protected content.
- Expected Result: The intended application session is restored or expires according to documented policy.
- Actual Result: There is no Google-authenticated session to refresh.
- Status: BLOCKED
- Severity: Medium
- Priority: P2
- Defect ID: GMAIL-DEF-001
- Remarks: No Google session duration is defined.

### GMAIL_TC_017 — Block protected dashboard without authentication
- Test Case ID: GMAIL_TC_017
- Module: Gmail / Google Authentication
- Test Scenario: Verify an unauthenticated browser cannot access the dashboard.
- Preconditions: Local website is running with no stored application token.
- Test Data: Direct navigation to `/dashboard`; browser storage contained no `abhaya_token`.
- Test Steps: 1. Navigate directly to `/dashboard`. 2. Observe the final URL and rendered page.
- Expected Result: User is redirected to the login page and dashboard content is not shown.
- Actual Result: Browser redirected to `/login`; the login form was rendered.
- Status: PASS
- Severity: Low
- Priority: P3
- Defect ID: N/A
- Remarks: This verifies the existing generic route guard, not Google authentication.

### GMAIL_TC_018 — Open the Google callback URL directly
- Test Case ID: GMAIL_TC_018
- Module: Gmail / Google Authentication
- Test Scenario: Verify a direct callback URL does not create an unauthenticated session.
- Preconditions: Local website is running without an application token.
- Test Data: `/auth/google/callback?code=qa-placeholder&state=qa-placeholder`.
- Test Steps: 1. Navigate directly to the callback-like URL. 2. Inspect final URL and token storage.
- Expected Result: No application session is created from unverified callback parameters.
- Actual Result: The unknown frontend route redirected to `/`; `abhaya_token` remained absent.
- Status: PASS
- Severity: Low
- Priority: P3
- Defect ID: N/A
- Remarks: The safe fallback is not a functioning OAuth callback.

### GMAIL_TC_019 — Handle Google service or network outage
- Test Case ID: GMAIL_TC_019
- Module: Gmail / Google Authentication
- Test Scenario: Verify recovery when Google or the network is unavailable during authentication.
- Preconditions: Google login flow and a controlled network-failure test environment exist.
- Test Data: Controlled provider/network outage; no production disruption.
- Test Steps: 1. Start Google Sign-In. 2. Interrupt provider connectivity. 3. Observe loading state, message, and retry behavior.
- Expected Result: Loading terminates, no session is created, and a clear retryable error is shown.
- Actual Result: No Google request or flow can be started.
- Status: BLOCKED
- Severity: Medium
- Priority: P2
- Defect ID: GMAIL-DEF-001
- Remarks: No real provider outage was induced.

### GMAIL_TC_020 — Validate Google profile claims and normalization
- Test Case ID: GMAIL_TC_020
- Module: Gmail / Google Authentication
- Test Scenario: Verify name and verified email claims are mapped and normalized safely.
- Preconditions: Backend validates Google identity claims and a test identity is available.
- Test Data: Synthetic provider profile with mixed-case email and known display name.
- Test Steps: 1. Authenticate the test identity. 2. Inspect persisted and returned name/email values.
- Expected Result: Verified claims are used; email normalization is consistent and unverified claims are not trusted.
- Actual Result: No Google profile mapping or persistence path exists.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: No profile claim was fabricated as an authenticated user.

### GMAIL_TC_021 — Prevent duplicate users on repeated Google login
- Test Case ID: GMAIL_TC_021
- Module: Gmail / Google Authentication
- Test Scenario: Ensure repeated login for one Google subject does not create duplicate users.
- Preconditions: Provider subject identifiers are mapped and database is isolated.
- Test Data: One dedicated synthetic/authorized Google subject.
- Test Steps: 1. Authenticate the same subject twice. 2. Count matching user and provider-link records.
- Expected Result: One stable local account and one provider link remain.
- Actual Result: No Google subject mapping or link records exist.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: Existing email uniqueness alone does not demonstrate Google duplicate prevention.

### GMAIL_TC_022 — Protect account linking from unrelated Google identities
- Test Case ID: GMAIL_TC_022
- Module: Gmail / Google Authentication
- Test Scenario: Ensure an unrelated Google identity cannot overwrite or merge an existing account.
- Preconditions: OAuth linking and account ownership policy are implemented.
- Test Data: Two distinct isolated test identities and one existing local account.
- Test Steps: 1. Attempt to link the unrelated identity. 2. Inspect account ownership and provider links.
- Expected Result: Linking is denied unless the approved ownership-verification policy succeeds; original account data is unchanged.
- Actual Result: No Google account-linking implementation or policy exists.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: No production or test account was modified.

### GMAIL_TC_023 — Handle missing or malformed Google profile claims
- Test Case ID: GMAIL_TC_023
- Module: Gmail / Google Authentication
- Test Scenario: Reject provider profiles missing required or correctly typed identity claims.
- Preconditions: Backend claim validation is implemented.
- Test Data: Isolated mock profiles with missing subject, malformed email, and absent name.
- Test Steps: 1. Submit each profile through the isolated callback test. 2. Inspect response and database state.
- Expected Result: Invalid identity claims are rejected safely and create no partial account.
- Actual Result: No Google callback or claim validation exists.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: Mock provider responses were not created because no flow exists to exercise them.

### GMAIL_TC_024 — Prevent duplicate authentication requests on repeated clicks
- Test Case ID: GMAIL_TC_024
- Module: Gmail / Google Authentication
- Test Scenario: Ensure repeated clicks do not launch duplicate Google flows.
- Preconditions: Google Sign-In control and observable provider request are implemented.
- Test Data: One browser session; repeated clicks on the Google control.
- Test Steps: 1. Click the control repeatedly during startup. 2. Count popup/redirect requests and sessions.
- Expected Result: One in-flight authentication attempt is active and only one session can be established.
- Actual Result: No Google control or request exists.
- Status: BLOCKED
- Severity: Medium
- Priority: P2
- Defect ID: GMAIL-DEF-001
- Remarks: Cannot infer behavior from the password submit button.

### GMAIL_TC_025 — Preserve database consistency on Google failure or cancellation
- Test Case ID: GMAIL_TC_025
- Module: Gmail / Google Authentication
- Test Scenario: Verify unsuccessful Google attempts leave no partial account or link.
- Preconditions: OAuth flow and isolated test database are available.
- Test Data: Dedicated test database; cancellation and provider failure cases.
- Test Steps: 1. Record baseline user/link counts. 2. Cancel or fail authentication. 3. Compare database counts and rows.
- Expected Result: No partial user, provider link, or session is persisted.
- Actual Result: No Google persistence path exists to exercise.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: No test data was written.

### GMAIL_TC_026 — Validate OAuth state and CSRF protection
- Test Case ID: GMAIL_TC_026
- Module: Gmail / Google Authentication
- Test Scenario: Reject missing, mismatched, replayed, or tampered OAuth state.
- Preconditions: OAuth authorization and callback handlers are implemented.
- Test Data: Synthetic state values in isolated tests.
- Test Steps: 1. Start authorization and capture test state. 2. Submit missing, mismatched, replayed, and altered values to callback.
- Expected Result: Every invalid state is rejected without session creation.
- Actual Result: No OAuth state generation or validation exists.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: No CSRF bypass was attempted against a nonexistent callback.

### GMAIL_TC_027 — Validate OAuth redirect URI
- Test Case ID: GMAIL_TC_027
- Module: Gmail / Google Authentication
- Test Scenario: Confirm OAuth uses only explicitly registered redirect URIs.
- Preconditions: Google client and callback configuration are implemented.
- Test Data: Approved redirect URI and an unapproved URI in an isolated configuration.
- Test Steps: 1. Start login using the approved URI. 2. Attempt an unapproved redirect. 3. Inspect provider request and callback handling.
- Expected Result: Only the exact approved redirect URI is accepted.
- Actual Result: No Google client or redirect URI setting exists.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: No redirect URI was registered or changed.

### GMAIL_TC_028 — Validate Google ID token signature and claims
- Test Case ID: GMAIL_TC_028
- Module: Gmail / Google Authentication
- Test Scenario: Validate issuer, audience, expiry, and signature on the trusted backend.
- Preconditions: Backend Google ID-token verification is implemented.
- Test Data: Isolated valid and invalid provider-issued test tokens.
- Test Steps: 1. Submit a valid token. 2. Repeat with wrong issuer/audience, expired token, and invalid signature. 3. Observe session creation.
- Expected Result: Only a cryptographically valid token with expected issuer, audience, and expiry is accepted.
- Actual Result: No ID-token verifier or Google auth route exists.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: No token was created, logged, or submitted.

### GMAIL_TC_029 — Reject tampered or expired application authentication
- Test Case ID: GMAIL_TC_029
- Module: Gmail / Google Authentication
- Test Scenario: Verify tampered and expired application tokens cannot access protected resources.
- Preconditions: Google authentication issues an application session with a defined expiry.
- Test Data: Synthetic altered and expired application tokens.
- Test Steps: 1. Attempt a protected request with each token. 2. Inspect status and user state.
- Expected Result: Invalid tokens are rejected and no protected content is returned.
- Actual Result: Google-issued application tokens do not exist; this Google-session test could not run.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: Generic current JWT behavior is outside this Google-specific test.

### GMAIL_TC_030 — Prevent OAuth open redirects
- Test Case ID: GMAIL_TC_030
- Module: Gmail / Google Authentication
- Test Scenario: Ensure callback destinations cannot redirect users to untrusted hosts.
- Preconditions: OAuth callback accepts a post-login destination.
- Test Data: Safe same-origin destination and untrusted external destination.
- Test Steps: 1. Begin login with each destination. 2. Complete the isolated callback. 3. Inspect final location.
- Expected Result: Only allow-listed same-origin destinations are followed.
- Actual Result: No OAuth redirect destination handling exists.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: No external redirect was attempted.

### GMAIL_TC_031 — Verify Google session cookie and expiry policy
- Test Case ID: GMAIL_TC_031
- Module: Gmail / Google Authentication
- Test Scenario: Verify Google-created session cookie flags and expiration.
- Preconditions: Google authentication has a documented cookie-based session policy.
- Test Data: Dedicated test browser session.
- Test Steps: 1. Authenticate through Google. 2. Inspect cookie security attributes and expiry. 3. Wait for/force test expiry.
- Expected Result: Session uses approved Secure, HttpOnly, and SameSite settings and expires according to policy.
- Actual Result: No Google session cookie or policy exists.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: Current email/password auth stores its app token in browser local storage; this is not a Google session-cookie test.

### GMAIL_TC_032 — Prevent exposure of Google credentials and tokens
- Test Case ID: GMAIL_TC_032
- Module: Gmail / Google Authentication
- Test Scenario: Check browser URLs, storage, logs, and errors for Google secrets or provider tokens.
- Preconditions: A Google authentication attempt can be safely captured in a test environment.
- Test Data: Synthetic test credentials/tokens only.
- Test Steps: 1. Run the isolated auth flow. 2. Inspect URLs, browser storage, console/network logs, and error messages.
- Expected Result: Client secrets never reach the browser; tokens and credentials are not leaked through URLs, logs, or user-facing errors.
- Actual Result: No Google auth attempt or Google token handling exists; no provider credential is configured in the inspected files.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: No secret values were accessed or disclosed.

### GMAIL_TC_033 — Invalidate Google application session after logout
- Test Case ID: GMAIL_TC_033
- Module: Gmail / Google Authentication
- Test Scenario: Confirm a logged-out Google application session cannot reuse protected access.
- Preconditions: Google login and session invalidation are implemented.
- Test Data: Dedicated Google test session.
- Test Steps: 1. Authenticate. 2. Log out. 3. Replay the prior application session against a protected endpoint.
- Expected Result: The old application session is invalidated or rejected according to the documented token policy.
- Actual Result: Google sessions and a Google-specific logout/revocation path are absent.
- Status: BLOCKED
- Severity: High
- Priority: P1
- Defect ID: GMAIL-DEF-001
- Remarks: Clearing existing password-auth browser storage is not proof of server-side Google token revocation.

### GMAIL_TC_034 — Apply abuse controls to Google authentication
- Test Case ID: GMAIL_TC_034
- Module: Gmail / Google Authentication
- Test Scenario: Verify appropriate rate limiting or abuse controls on Google auth start and callback.
- Preconditions: Google auth endpoints are implemented and have a documented request policy.
- Test Data: Bounded requests in an isolated test environment.
- Test Steps: 1. Send requests within the documented limit. 2. Exceed the limit. 3. Inspect throttling and logs.
- Expected Result: Abuse is throttled without disclosing provider secrets or blocking normal use.
- Actual Result: No Google auth endpoints or Google-specific rate limit policy exists.
- Status: BLOCKED
- Severity: Medium
- Priority: P2
- Defect ID: GMAIL-DEF-001
- Remarks: No load or abuse traffic was sent to Google.

### GMAIL_TC_035 — Check Google control accessibility and copy
- Test Case ID: GMAIL_TC_035
- Module: Gmail / Google Authentication
- Test Scenario: Verify Google button label, accessible name, keyboard focus, icon, and copy.
- Preconditions: Google Sign-In control is implemented.
- Test Data: Login page in an accessible browser.
- Test Steps: 1. Navigate the login page by keyboard. 2. Locate and focus the Google control. 3. Inspect accessible name and visible copy.
- Expected Result: One clearly labeled, keyboard-accessible control has visible focus and professional, consistent copy.
- Actual Result: No Google Sign-In control exists; its accessibility and copy cannot be evaluated.
- Status: BLOCKED
- Severity: Medium
- Priority: P2
- Defect ID: GMAIL-DEF-001
- Remarks: The absence of the control is separately recorded as GMAIL_TC_002.

### GMAIL_TC_036 — Check Google flow loading and error usability
- Test Case ID: GMAIL_TC_036
- Module: Gmail / Google Authentication
- Test Scenario: Verify loading, duplicate-click prevention, cancellation, and provider-error messages.
- Preconditions: Google Sign-In interaction is implemented.
- Test Data: Test provider success, cancellation, and failure responses.
- Test Steps: 1. Trigger each flow. 2. Inspect loading state and button availability. 3. Check that one clear message is shown.
- Expected Result: Loading is visible; duplicate attempts are prevented; cancellation and failures have clear, nonduplicated messages.
- Actual Result: No Google control or corresponding interaction states exist.
- Status: BLOCKED
- Severity: Medium
- Priority: P2
- Defect ID: GMAIL-DEF-001
- Remarks: Password-login UI behavior was not substituted.

### GMAIL_TC_037 — Check Google Sign-In responsive layout
- Test Case ID: GMAIL_TC_037
- Module: Gmail / Google Authentication
- Test Scenario: Verify the Google Sign-In control at desktop, tablet, and mobile widths.
- Preconditions: Google Sign-In control is implemented and viewport automation is available.
- Test Data: Desktop, tablet, and mobile viewport sizes.
- Test Steps: 1. Open login at each viewport. 2. Inspect control visibility, overflow, and target size.
- Expected Result: The control remains visible, readable, and operable without horizontal overflow at each supported size.
- Actual Result: No Google control exists to test.
- Status: BLOCKED
- Severity: Low
- Priority: P3
- Defect ID: GMAIL-DEF-001
- Remarks: No responsive Google UI result is claimed.

### GMAIL_TC_038 — Check supported-browser Google flow compatibility
- Test Case ID: GMAIL_TC_038
- Module: Gmail / Google Authentication
- Test Scenario: Run Google authentication in supported Chrome, Firefox, and Edge versions.
- Preconditions: Browser support policy, OAuth implementation, and authorized test account exist.
- Test Data: Dedicated test identity and supported browser versions.
- Test Steps: 1. Complete sign-in in each supported browser. 2. Verify callback, session, and dashboard behavior.
- Expected Result: Each supported browser completes the same secure authentication flow.
- Actual Result: No browser has a Google Sign-In flow to execute; only the integrated local browser was available.
- Status: BLOCKED
- Severity: Medium
- Priority: P2
- Defect ID: GMAIL-DEF-001
- Remarks: Chrome, Firefox, and Edge provider compatibility is unverified.

### GMAIL_TC_039 — Recover from slow or interrupted Google authentication
- Test Case ID: GMAIL_TC_039
- Module: Gmail / Google Authentication
- Test Scenario: Verify slow network, interrupted callback, retry, and browser back behavior.
- Preconditions: Google flow supports a controlled network test and callback recovery.
- Test Data: Controlled latency/interruption and test browser history.
- Test Steps: 1. Start Google Sign-In with delayed connectivity. 2. Interrupt or navigate back during callback. 3. Retry and inspect session state.
- Expected Result: The page does not hang or create duplicate sessions; retry and back navigation fail safely.
- Actual Result: No Google request, callback, or retry state exists.
- Status: BLOCKED
- Severity: Medium
- Priority: P2
- Defect ID: GMAIL-DEF-001
- Remarks: No external network degradation was induced.

## Coverage Summary

| Area | Coverage |
|---|---|
| Functional | Provider existence, UI availability, and endpoint presence were executed and failed; provider success, account creation/linking, cancellation, failure, and session flows are blocked. |
| Validation and data integrity | Identity claim validation, normalization, duplicates, account linking, malformed profiles, and failure cleanup are blocked. |
| Security | Existing unauthenticated route protection and safe direct-callback fallback passed; OAuth state, redirect, token, session, disclosure, and rate-limit checks are blocked. |
| UI and usability | Login page was observed; no Google control exists. Google-specific accessibility, loading, error, and responsive checks are blocked. |
| Compatibility and reliability | Google-specific browser, slow-network, interruption, and retry checks are blocked. |

## Automation and Regression

- **Google OAuth automated tests added or updated:** None. There is no Google implementation to test; adding mocked tests without an OAuth boundary would produce misleading coverage.
- **Existing backend regression suite:** `backend/tests/test_core.py` and `backend/tests/test_input_validation.py` — **16 passed, 0 failed** on 2026-10-23. Pytest emitted 17 existing dependency/configuration warnings.
- **Browser evidence:** `/login` rendered without a Google button; direct `/dashboard` navigation redirected to `/login`; a callback-like URL redirected to `/` without an `abhaya_token`.
- **API evidence:** `/api/auth/google` and `/api/auth/google/callback` both returned HTTP 404; `/api/status` did not report a Google integration.
- **Secrets:** No Google credentials, real accounts, or provider tokens were used or recorded.

## Release Assessment

**Google Sign-In is not ready for release because it is not implemented.** The passing generic route-protection checks and existing password-auth regression suite do not establish Google authentication readiness. After an approved OAuth client and redirect URI are configured without committing secrets, implement the provider flow and rerun the blocked test cases with an authorized test account.
