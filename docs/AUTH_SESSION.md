# XIII authentication & session lifecycle

Current authentication behavior for Buyer, Seller Center and Admin:

- Login stores an access token and rotating refresh token in the app-specific browser session keys.
- Access tokens expire after 15 minutes; refresh tokens expire after 30 days.
- Refresh is single-flight per frontend app, preventing concurrent 401 responses from racing the rotating refresh token.
- `POST /api/v1/auth/logout` revokes the server-side refresh-token hash.
- Buyer, Seller and Admin logout always clear access token, refresh token and cached user information locally, even if the API is temporarily unreachable.
- Buyer/Seller realtime Socket.IO connections are disconnected when the session is cleared.
- If refresh returns 401/403, the local session is cleared and protected screens are redirected to Login with a `next` return path.
- Removing a session in another browser tab is observed through the `storage` event and closes the local authenticated state in the other tab.

## Browser verification

Run:

```bash
npm run e2e
```

`e2e/tests/auth-session.spec.ts` verifies Buyer, Seller and Admin logout, local storage cleanup, server-side refresh-token revocation and expired-session redirect behavior.

## Current design note

The user schema currently stores one refresh-token hash per account. Logging in again rotates that hash, so the newest login becomes the active refresh session for that account. A future multi-device session feature should use a dedicated session collection with one hashed refresh token per device/session.
