# Cognito JWT Authentication Migration

## Overview

This document describes the migration from **session-based authentication** to **JWT token-based authentication** for Cognito OAuth flow. This change brings consistency between traditional auth and Cognito auth.

## Problem Statement

Previously, there was an inconsistency between authentication methods:

### Traditional Auth (auth.ts)

- Signup/Login returns JWT token in JSON response
- Frontend stores token in localStorage/sessionStorage
- Frontend sends token in `Authorization: Bearer <token>` header
- Middleware validates JWT using passport JWT strategy

### Cognito Auth (OLD Implementation)

- OAuth callback created a server-side session
- Frontend relied on session cookies
- Different middleware for session validation
- Inconsistent with traditional auth flow

## Solution: Unified JWT Authentication

Both traditional and Cognito auth now use the same JWT token-based approach.

## Changes Made

### 1. Cognito Callback Route (`/api/auth/callback`)

**Before:**

```typescript
// Created session
await sessionService.createSession(req, { ... });
// Redirected to dashboard
res.redirect(`${frontendUrl}/dashboard`);
```

**After:**

```typescript
// Generate JWT token
const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, {
  expiresIn: "7d",
});

// Redirect with token in URL
res.redirect(
  `${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(
    JSON.stringify({ id, name, email, roles })
  )}`
);
```

### 2. Cognito Auth Middleware (`src/middleware/cognitoAuth.ts`)

**Before:**

```typescript
// Used sessionService to validate session
const sessionData = sessionService.getSessionData(req);
if (!sessionData) {
  throw new AppError(401, "Invalid session");
}
```

**After:**

```typescript
// Uses passport JWT strategy (same as traditional auth)
passport.authenticate("jwt", { session: false }, async (err, user) => {
  if (err || !user) {
    return next(new AppError(401, "Unauthorized"));
  }
  req.user = user;
  next();
})(req, res, next);
```

### 3. `/auth/me` Endpoint

**Before:**

```typescript
// Read from session
const sessionData = sessionService.getSessionData(req);
```

**After:**

```typescript
// Verify JWT token
const token = req.headers.authorization.substring(7);
const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
const user = await User.findById(decoded.id);
```

### 4. Logout Endpoint

**Before:**

```typescript
// Destroyed server-side session
await sessionService.destroySession(req);
```

**After:**

```typescript
// JWT is stateless - just return Cognito logout URL
// Frontend clears token from localStorage
res.json({
  status: "success",
  message:
    "Logged out successfully. Please clear your JWT token on the client side.",
  logoutUrl,
});
```

## Authentication Flow

### Signup/Login Flow

1. **User initiates login**

   - Frontend redirects to `/api/auth/login`
   - Backend redirects to Cognito Hosted UI

2. **User authenticates with Cognito**

   - User enters credentials or uses social login
   - Cognito redirects back to `/api/auth/callback?code=...`

3. **Backend processes callback**

   - Exchange OAuth code for tokens
   - Verify Cognito ID token
   - Extract user info from token
   - **Check if user exists in database:**
     - **New user (Signup)**: Create user + free tier subscription atomically
     - **Existing user (Login)**: Update user info + lastLogin timestamp
   - Generate JWT token with user ID
   - Redirect to frontend with token

4. **Frontend stores token**

   - Extract token from URL query parameter
   - Store in localStorage or sessionStorage
   - Redirect user to dashboard
   - Clear token from URL history

5. **Subsequent API requests**
   - Frontend sends: `Authorization: Bearer <token>`
   - Backend validates JWT using passport
   - Attaches `req.user` to request

### Signup Detection

The `upsertUser` function handles both signup and login:

```typescript
async function upsertUser(userInfo, roles) {
  // Try to find existing user
  let user = await User.findOne({
    $or: [{ cognitoSub: userInfo.cognitoSub }, { email: userInfo.email }],
  });

  if (user) {
    // EXISTING USER - LOGIN
    user.email = userInfo.email;
    user.name = userInfo.name || user.name;
    user.roles = roles;
    user.lastLogin = new Date();
    await user.save();
  } else {
    // NEW USER - SIGNUP
    user = await User.create({
      cognitoSub: userInfo.cognitoSub,
      email: userInfo.email,
      name: userInfo.name,
      roles,
      status: "active",
      lastLogin: new Date(),
    });

    // Create free tier subscription (CRITICAL)
    try {
      await SubscriptionService.createFreeTierSubscription(user._id.toString());
    } catch (subscriptionError) {
      // Rollback user creation if subscription fails
      await User.findByIdAndDelete(user._id);
      throw new AppError(500, "Failed to create user subscription");
    }
  }

  return user;
}
```

**Key Points:**

- ✅ **Idempotent**: Can be called multiple times safely
- ✅ **Atomic**: User creation + subscription creation together (or both fail)
- ✅ **Automatic detection**: No explicit signup/login endpoints needed
- ✅ **Consistent with traditional signup**: Same subscription creation logic

## Frontend Integration

### 1. Create Auth Callback Page

Create `/auth/callback` page in your frontend:

```typescript
// pages/auth/callback.tsx (Next.js example)
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const { token, user } = router.query;

    if (token && typeof token === 'string') {
      // Store token
      localStorage.setItem('authToken', token);

      // Store user info if provided
      if (user && typeof user === 'string') {
        const userData = JSON.parse(decodeURIComponent(user));
        localStorage.setItem('user', JSON.stringify(userData));
      }

      // Redirect to dashboard
      router.replace('/dashboard');
    }
  }, [router]);

  return <div>Completing authentication...</div>;
}
```

### 2. Update API Client

```typescript
// utils/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (token expired/invalid)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 3. Update Login Flow

```typescript
// components/LoginButton.tsx
export function LoginButton() {
  const handleLogin = () => {
    // Redirect to backend login endpoint
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`;
  };

  return <button onClick={handleLogin}>Login with SSO</button>;
}
```

### 4. Update Logout Flow

```typescript
// components/LogoutButton.tsx
export function LogoutButton() {
  const handleLogout = async () => {
    try {
      // Call backend logout to get Cognito logout URL
      const response = await api.post('/api/auth/logout');

      // Clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');

      // Redirect to Cognito logout
      window.location.href = response.data.logoutUrl;
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

## Benefits

1. ✅ **Consistency**: Both auth methods use same JWT approach
2. ✅ **Simplicity**: No session management, Redis, or cookies needed
3. ✅ **Stateless**: Scales horizontally without session store
4. ✅ **Single middleware**: One authentication middleware for all routes
5. ✅ **Standard practice**: JWT is industry standard for SPAs
6. ✅ **Signup detection**: Automatic user creation with proper DB records
7. ✅ **Data consistency**: Atomic user + subscription creation

## Security Considerations

1. **Token Storage**: Store JWT in localStorage (acceptable for SPAs)
2. **Token Expiration**: 7-day expiration (same as traditional auth)
3. **HTTPS Only**: Always use HTTPS in production
4. **Token Validation**: Backend validates signature and expiration
5. **No XSS**: Don't store token in cookies (httpOnly not needed)

## Migration Checklist

- [x] Update Cognito callback to generate JWT
- [x] Update Cognito middleware to use JWT
- [x] Remove sessionService dependencies
- [x] Update `/auth/me` endpoint
- [x] Update logout endpoint
- [ ] Update frontend auth callback page
- [ ] Update frontend API client
- [ ] Update frontend login/logout flows
- [ ] Test complete auth flow
- [ ] Test signup vs login behavior
- [ ] Verify subscription creation for new users

## Testing

### Test New User Signup

1. Clear database or use new email
2. Login via Cognito Hosted UI
3. Verify user created in database
4. Verify subscription created for user
5. Verify JWT token returned to frontend

### Test Existing User Login

1. Login with existing user
2. Verify user info updated
3. Verify lastLogin timestamp updated
4. Verify subscription NOT recreated
5. Verify JWT token returned

### Test Token Validation

1. Make API request with valid token → Should succeed
2. Make API request with expired token → Should return 401
3. Make API request with invalid token → Should return 401
4. Make API request without token → Should return 401

## Rollback Plan

If issues arise, you can rollback by:

1. Restore previous versions of files:

   - `src/routes/cognitoAuth.ts`
   - `src/middleware/cognitoAuth.ts`

2. Add back sessionService import

3. Redeploy

Note: Users authenticated after this change will need to re-login after rollback.

## Next Steps

1. Update frontend to handle token in URL callback
2. Test thoroughly in development
3. Deploy to staging environment
4. Monitor for authentication errors
5. Deploy to production

## Questions?

Contact the development team or refer to:

- `/docs/cognito/COGNITO_AUTH_IMPLEMENTATION.md`
- `/docs/cognito/COGNITO_DATA_FLOW.md`
