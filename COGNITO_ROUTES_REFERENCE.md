# Cognito Authentication Routes Reference

Quick reference for all Cognito authentication routes and their usage.

## 🌐 Public Routes (No Authentication Required)

### 1. Initiate Login

```http
GET /api/auth/login
```

**Description:** Redirects user to Cognito Hosted UI for authentication.

**Query Parameters:** None

**Response:** HTTP 302 Redirect to Cognito

**Example:**

```bash
curl -L http://localhost:5000/api/auth/login
```

**Frontend Usage:**

```typescript
// Simply redirect the user
window.location.href = "http://localhost:5000/api/auth/login";
```

---

### 2. OAuth Callback

```http
GET /api/auth/callback?code=XXX&state=YYY
```

**Description:** Handles OAuth callback from Cognito. Creates/updates user, creates subscription for new users, establishes session.

**Query Parameters:**

- `code`: Authorization code from Cognito (required)
- `state`: CSRF protection token (required)

**Response:** HTTP 302 Redirect to frontend dashboard

**Note:** This endpoint is called by Cognito, not directly by your frontend.

---

### 3. Forgot Password

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "username": "user@example.com"
}
```

**Description:** Initiates password reset flow via Cognito.

**Request Body:**

```typescript
{
  username: string; // User's email
}
```

**Response:**

```json
{
  "status": "success",
  "message": "If an account exists with this email, a password reset code has been sent."
}
```

**Example:**

```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"username":"user@example.com"}'
```

---

### 4. Confirm Password Reset

```http
POST /api/auth/confirm-forgot-password
Content-Type: application/json

{
  "username": "user@example.com",
  "code": "123456",
  "newPassword": "NewSecurePass123!"
}
```

**Description:** Confirms password reset with code from email.

**Request Body:**

```typescript
{
  username: string; // User's email
  code: string; // 6-digit code from email
  newPassword: string; // New password (min 8 chars, uppercase, lowercase, number, special char)
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Password has been reset successfully."
}
```

**Password Requirements:**

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Example:**

```bash
curl -X POST http://localhost:5000/api/auth/confirm-forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "username":"user@example.com",
    "code":"123456",
    "newPassword":"NewSecurePass123!"
  }'
```

---

## 🔒 Protected Routes (Authentication Required)

### 5. Get Current User

```http
GET /api/auth/me
Cookie: aeo_session=...
```

**Description:** Returns current authenticated user information.

**Headers:**

- `Cookie`: Session cookie (automatically sent by browser)

**Response:**

```json
{
  "status": "success",
  "user": {
    "id": "us-east-1_XXX_cognito-sub-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "roles": ["user"],
    "groups": []
  }
}
```

**Example:**

```bash
curl http://localhost:5000/api/auth/me \
  --cookie "aeo_session=..."
```

**Frontend Usage (with axios):**

```typescript
const response = await axios.get("/api/auth/me", {
  withCredentials: true, // Important: sends cookies
});
```

---

### 6. Logout

```http
POST /api/auth/logout
Cookie: aeo_session=...
```

**Description:** Destroys server session and returns Cognito logout URL.

**Headers:**

- `Cookie`: Session cookie (automatically sent by browser)

**Response:**

```json
{
  "status": "success",
  "message": "Logged out successfully",
  "logoutUrl": "https://your-app.auth.us-east-1.amazoncognito.com/logout?client_id=...&logout_uri=..."
}
```

**Frontend Usage:**

```typescript
const response = await axios.post(
  "/api/auth/logout",
  {},
  {
    withCredentials: true,
  }
);

// Redirect to Cognito logout to complete the process
window.location.href = response.data.logoutUrl;
```

**Example:**

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  --cookie "aeo_session=..."
```

---

## 🎨 Frontend Integration Examples

### React Hook for Authentication

```typescript
// hooks/useAuth.ts
import { useState, useEffect } from "react";
import axios from "axios";

interface IUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  groups: string[];
}

export function useAuth() {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get("/api/auth/me", {
        withCredentials: true,
      });
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    // Redirect to backend login endpoint
    window.location.href = "/api/auth/login";
  };

  const logout = async () => {
    try {
      const response = await axios.post(
        "/api/auth/logout",
        {},
        {
          withCredentials: true,
        }
      );
      // Redirect to Cognito logout
      window.location.href = response.data.logoutUrl;
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return { user, loading, login, logout };
}
```

### Protected Route Component

```typescript
// components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

### Login Page

```typescript
// pages/Login.tsx
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { login } = useAuth();

  return (
    <div>
      <h1>Welcome</h1>
      <button onClick={login}>
        Login with Cognito
      </button>
    </div>
  );
}
```

### Axios Configuration

```typescript
// lib/axios.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true, // Important: always send cookies
});

export default api;
```

---

## 🔄 Complete Authentication Flow (Step-by-Step)

### Signup/Login Flow

```
1. User clicks "Login" button
   └─> Frontend redirects to: GET /api/auth/login

2. Backend redirects to Cognito Hosted UI
   └─> User sees Cognito login/signup page

3. User enters credentials (or uses Google, etc.)
   └─> Cognito validates credentials

4. Cognito redirects back to: GET /api/auth/callback?code=XXX&state=YYY
   └─> Backend validates state
   └─> Backend exchanges code for tokens
   └─> Backend verifies JWT signature
   └─> Backend creates/updates user in database
   └─> Backend creates free tier subscription (for new users)
   └─> Backend creates session cookie

5. Backend redirects to: ${FRONTEND_ORIGIN}/dashboard
   └─> User is now logged in with session cookie

6. Frontend makes API calls with cookie automatically included
   └─> Backend validates session on each request
```

### Logout Flow

```
1. User clicks "Logout" button
   └─> Frontend calls: POST /api/auth/logout

2. Backend destroys session
   └─> Returns Cognito logout URL

3. Frontend redirects to Cognito logout URL
   └─> Cognito clears its session

4. Cognito redirects to: ${LOGOUT_REDIRECT_URL}
   └─> User is now logged out
```

### Password Reset Flow

```
1. User clicks "Forgot Password"
   └─> Frontend calls: POST /api/auth/forgot-password

2. Backend calls Cognito
   └─> Cognito sends email with code

3. User enters code + new password
   └─> Frontend calls: POST /api/auth/confirm-forgot-password

4. Backend calls Cognito to confirm
   └─> Password is reset

5. User can now login with new password
```

---

## 🛠️ Testing with cURL

### Test Login Flow (Manual)

```bash
# Step 1: Get login URL
curl -v http://localhost:5000/api/auth/login

# Copy the redirect URL from the response and open in browser
# After login, Cognito will redirect to /api/auth/callback

# Step 2: Check if logged in
curl http://localhost:5000/api/auth/me \
  --cookie "aeo_session=<cookie-from-browser>"
```

### Test Password Reset

```bash
# Step 1: Request reset code
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"username":"test@example.com"}'

# Step 2: Confirm with code (check email)
curl -X POST http://localhost:5000/api/auth/confirm-forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "username":"test@example.com",
    "code":"123456",
    "newPassword":"NewSecurePass123!"
  }'
```

---

## 📋 Environment Variables Required

```bash
# Auth Provider
AUTH_PROVIDER=cognito

# Cognito
COGNITO_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_APP_CLIENT_ID=your-app-client-id
COGNITO_DOMAIN=https://your-app.auth.us-east-1.amazoncognito.com

# OAuth URLs
OAUTH_REDIRECT_URI=http://localhost:5000/api/auth/callback
OAUTH_LOGOUT_REDIRECT_URI=http://localhost:3000

# Session
SESSION_SECRET=your-secret-min-32-characters
SESSION_TTL_SECONDS=28800
COOKIE_NAME=aeo_session

# Frontend
FRONTEND_ORIGIN=http://localhost:3000
```

---

## 🐛 Common Issues & Solutions

### Issue: "Invalid state parameter"

**Cause:** State token expired (10 minute TTL) or CSRF attack
**Solution:** Retry login flow

### Issue: "Failed to create user subscription"

**Cause:** Database connection issue or Package seeding not complete
**Solution:**

1. Check MongoDB connection
2. Ensure Free package exists: `db.packages.findOne({ name: "Free" })`
3. Run package seeding: `npm run seed-packages`

### Issue: Cookie not being sent

**Cause:** Frontend not configured to send credentials
**Solution:** Add `withCredentials: true` to all axios/fetch requests

### Issue: CORS error

**Cause:** Frontend origin not allowed
**Solution:** Ensure `CLIENT_URL` and `FRONTEND_ORIGIN` are set correctly

### Issue: Session expires too quickly

**Cause:** Default TTL is 8 hours
**Solution:** Increase `SESSION_TTL_SECONDS` in environment variables

---

## 📞 Support

For issues or questions:

1. Check the logs for detailed error messages
2. Verify environment variables are set correctly
3. Ensure Cognito User Pool and App Client are configured properly
4. Review the [COGNITO_DATA_FLOW.md](./COGNITO_DATA_FLOW.md) for architecture details
