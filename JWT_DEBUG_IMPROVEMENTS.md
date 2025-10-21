# JWT Token Debugging Improvements

## Problem Identified

The logs show a "jwt malformed" error when the client tries to authenticate with `/api/auth/me`. The Cognito authentication flow works correctly, but the subsequent API call fails.

## Root Cause Analysis

Based on the error pattern, the client is likely sending:

```
Cookie: aeo_session=token
```

Where "token" is literally the string "token", not an actual JWT token.

## Debugging Improvements Added

### 1. Enhanced `/me` Endpoint Logging

```typescript
console.log(
  `🔍 Auth attempt: method=${authMethod}, token=${token ? token.substring(0, 20) + "..." : "none"}`
);
```

### 2. JWT Format Validation

```typescript
// Check if token is malformed (not a proper JWT format)
if (!token.includes(".") || token.split(".").length !== 3) {
  console.log(`❌ Malformed token detected: ${token.substring(0, 50)}...`);

  // Special case: if client is sending literal "token" string
  if (token === "token") {
    console.log(
      "💡 Client is sending literal 'token' string instead of actual JWT"
    );
    throw new AppError(
      401,
      "Invalid token: client is sending literal 'token' string instead of actual JWT token"
    );
  }

  throw new AppError(401, "Invalid token format");
}
```

### 3. Enhanced Callback Logging

```typescript
console.log(`🔑 Generated session token: ${sessionToken.substring(0, 50)}...`);
console.log(`🍪 Cookie set: aeo_session=${sessionToken.substring(0, 20)}...`);
```

### 4. Better Error Handling

```typescript
if (error instanceof jwt.JsonWebTokenError) {
  console.error("JWT Error details:", error.message);
  throw new AppError(401, "Invalid token");
}
```

## Debug Tools Created

### 1. `debug-cookie-auth.js`

Tests different cookie formats to identify the issue:

```bash
node debug-cookie-auth.js
```

### 2. `test-dual-auth.js` (updated)

Tests both Bearer token and cookie authentication methods.

## Expected Log Output

### Successful Authentication

```
🔍 Auth attempt: method=Cookie, token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
✅ Token verified for user: user@example.com
✅ User authenticated: user@example.com
```

### Malformed Token (Current Issue)

```
🔍 Auth attempt: method=Cookie, token=token...
❌ Malformed token detected: token...
💡 Client is sending literal 'token' string instead of actual JWT
```

## Next Steps

1. **Deploy the updated code** to production
2. **Monitor the logs** to see the exact token format being sent
3. **Identify the client issue** - likely hardcoded "token" string
4. **Fix the client** to send the actual JWT token from the cookie

## Client-Side Fix Needed

The client needs to:

1. **Extract the actual JWT token** from the `aeo_session` cookie
2. **Send the JWT token** instead of the literal string "token"
3. **Handle cookie parsing** correctly

Example client fix:

```javascript
// Instead of hardcoded "token"
const token = document.cookie
  .split("; ")
  .find((row) => row.startsWith("aeo_session="))
  ?.split("=")[1];

// Send actual token
fetch("/api/auth/me", {
  headers: {
    Cookie: `aeo_session=${token}`,
  },
});
```

## Files Modified

- `/src/routes/simplifiedCognitoAuth.ts` - Enhanced debugging and error handling
- `debug-cookie-auth.js` - Created debug tool
- `test-dual-auth.js` - Updated test tool
