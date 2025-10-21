# Dual Authentication Support Implementation

## Problem

The server was returning 401 Unauthorized for `/api/auth/me` requests with session cookies because the authentication system only supported one method at a time.

## Root Cause

- Two separate `/me` endpoints existed: one in `auth.ts` (legacy) and one in `simplifiedCognitoAuth.ts` (Cognito)
- When `AUTH_PROVIDER=cognito`, the `simplifiedCognitoAuth.ts` routes override the `auth.ts` routes
- The Cognito `/me` endpoint only supported `aeo_session` cookies, not Bearer tokens
- Client was sending `aeo_session=token` but the server expected a different format

## Solution

Updated `/src/routes/simplifiedCognitoAuth.ts` to support **both authentication methods**:

### 1. Enhanced `/me` Endpoint

```typescript
router.get("/me", async (req: Request, res: Response) => {
  let token = null;

  // Check Authorization header first (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }
  // If no Authorization header, check session cookie
  else if (req.cookies?.aeo_session) {
    token = req.cookies.aeo_session;
  }

  // ... rest of authentication logic
});
```

### 2. Enhanced Logout Endpoints

- **GET `/logout`**: Clears both `aeo_session` and `token` cookies, redirects to Cognito logout
- **POST `/logout`**: Clears both cookies, returns JSON response (for API calls)

## Authentication Methods Now Supported

### Method 1: Bearer Token (Legacy)

```bash
curl -H "Authorization: Bearer <jwt-token>" \
     https://server-api.themoda.io/api/auth/me
```

### Method 2: Session Cookie (Cognito)

```bash
curl -H "Cookie: aeo_session=<jwt-token>" \
     https://server-api.themoda.io/api/auth/me
```

### Method 3: Mixed (Client Flexibility)

Clients can now use either method interchangeably:

- Send Bearer token in Authorization header
- Send JWT token as `aeo_session` cookie
- Both methods work with the same JWT token format

## Testing

### Manual Testing

```bash
# Test with Bearer token
curl -H "Authorization: Bearer your-jwt-token" \
     https://server-api.themoda.io/api/auth/me

# Test with session cookie
curl -H "Cookie: aeo_session=your-jwt-token" \
     https://server-api.themoda.io/api/auth/me

# Test with test script
node test-dual-auth.js
```

### Expected Results

- ✅ Both authentication methods should return 200 with user data
- ✅ Requests without authentication should return 401
- ✅ Logout should clear both cookie types

## Files Modified

- `/src/routes/simplifiedCognitoAuth.ts` - Enhanced `/me` and `/logout` endpoints
- `test-dual-auth.js` - Created test script for verification

## Backward Compatibility

- ✅ Existing Bearer token authentication continues to work
- ✅ Existing Cognito session authentication continues to work
- ✅ No breaking changes to existing clients
- ✅ Both authentication methods use the same JWT token format

## Next Steps

1. Deploy the changes to production
2. Test with real client requests
3. Monitor logs for authentication success/failure patterns
4. Remove test script after verification
