# AWS Cognito Authentication Implementation

## Overview

This implementation provides a backend-only (BFF) authentication system using AWS Cognito with PKCE (Proof Key for Code Exchange) flow. The frontend never sees raw tokens, and all authentication is handled server-side with secure session management.

## Architecture

### Authentication Flow

1. **Login Initiation**: Frontend redirects to `/api/auth/login`
2. **PKCE Generation**: Server generates PKCE parameters and redirects to Cognito Hosted UI
3. **User Authentication**: User authenticates with Cognito
4. **Callback Handling**: Server receives authorization code and exchanges for tokens
5. **Session Creation**: Server creates secure session and redirects to frontend
6. **API Access**: Subsequent requests use session-based authentication

### Key Components

#### Services

- **JWT Validation Service**: Validates Cognito ID tokens using JWKS
- **Session Service**: Manages server-side sessions (Redis/memory)
- **Role Mapping Service**: Maps Cognito groups to application roles
- **Cognito Service**: Handles AWS Cognito API calls
- **Config Service**: Manages feature flags and configuration

#### Middleware

- **Cognito Auth Middleware**: Session-based authentication
- **Security Middleware**: CSRF protection, rate limiting, security headers
- **Legacy Auth Middleware**: JWT-based authentication (when AUTH_PROVIDER=legacy)

## Environment Configuration

### Required Environment Variables

```bash
# Authentication Provider (cognito | legacy)
AUTH_PROVIDER=cognito

# AWS Cognito Configuration
COGNITO_REGION=us-east-1
COGNITO_USER_POOL_ID=your-user-pool-id
COGNITO_APP_CLIENT_ID=your-app-client-id
COGNITO_DOMAIN=your-cognito-domain

# OAuth Configuration
OAUTH_REDIRECT_URI=http://localhost:5000/api/auth/callback
OAUTH_LOGOUT_REDIRECT_URI=http://localhost:3000

# Session Configuration
SESSION_SECRET=your-session-secret-key
SESSION_TTL_SECONDS=28800
COOKIE_NAME=aeo_session

# Redis Configuration (production)
REDIS_URL=redis://localhost:6379

# Frontend Configuration
FRONTEND_ORIGIN=http://localhost:3000
```

### AWS Cognito Setup

1. **Create User Pool**:

   - Enable email verification
   - Configure password policy
   - Set up MFA (optional)

2. **Create App Client**:

   - Enable PKCE
   - Configure OAuth flows
   - Set callback URLs

3. **Configure Groups**:
   - `aeo-owners` → `owner` role
   - `aeo-admins` → `admin` role
   - `aeo-users` → `user` role
   - `aeo-viewers` → `viewer` role

## API Endpoints

### Authentication Routes

#### GET `/api/auth/login`

Initiates Cognito OAuth flow with PKCE.

**Response**: Redirects to Cognito Hosted UI

#### GET `/api/auth/callback`

Handles Cognito OAuth callback.

**Query Parameters**:

- `code`: Authorization code from Cognito
- `state`: CSRF state parameter

**Response**: Redirects to frontend dashboard

#### POST `/api/auth/logout`

Logs out user and clears session.

**Response**:

```json
{
  "status": "success",
  "message": "Logged out successfully",
  "logoutUrl": "https://domain.auth.region.amazoncognito.com/logout?..."
}
```

#### GET `/api/auth/me`

Returns current user information.

**Response**:

```json
{
  "status": "success",
  "user": {
    "id": "cognito-sub",
    "email": "user@example.com",
    "name": "John Doe",
    "roles": ["user"],
    "groups": ["aeo-users"]
  }
}
```

#### POST `/api/auth/forgot-password`

Initiates password reset flow.

**Request Body**:

```json
{
  "username": "user@example.com"
}
```

**Response**:

```json
{
  "status": "success",
  "message": "If an account exists with this email, a password reset code has been sent."
}
```

#### POST `/api/auth/confirm-forgot-password`

Confirms password reset with code.

**Request Body**:

```json
{
  "username": "user@example.com",
  "code": "123456",
  "newPassword": "NewPassword123!"
}
```

**Response**:

```json
{
  "status": "success",
  "message": "Password has been reset successfully."
}
```

## Security Features

### Session Security

- **HttpOnly Cookies**: Prevents XSS attacks
- **Secure Flag**: HTTPS only in production
- **SameSite=Strict**: Prevents CSRF attacks
- **Short TTL**: 8-hour session expiration
- **Rolling Sessions**: Reset expiration on each request

### CSRF Protection

- **State Parameter**: Validates OAuth state
- **CSRF Tokens**: Required for state-changing operations
- **SameSite Cookies**: Additional CSRF protection

### Rate Limiting

- **Auth Endpoints**: 5 requests per 15 minutes
- **Password Reset**: 3 requests per hour
- **API Endpoints**: 100 requests per 15 minutes

### Security Headers

- **Helmet.js**: Comprehensive security headers
- **CORS**: Strict origin validation
- **HSTS**: HTTP Strict Transport Security
- **XSS Protection**: Cross-site scripting protection

## Role-Based Access Control

### Role Hierarchy

1. **Owner**: Full system access and billing
2. **Admin**: Company administration and user management
3. **User**: Standard user access
4. **Viewer**: Read-only access

### Permission System

```typescript
// Check if user has specific role
hasRole(req, "admin");

// Check if user has any of the roles
hasAnyRole(req, ["admin", "user"]);

// Check if user has specific permission
hasPermission(req, "users:manage");
```

## Database Schema Changes

### User Model Updates

```typescript
interface IUser {
  // Existing fields...
  cognitoSub?: string; // Cognito user ID
  roles: string[]; // Mapped application roles
  cognitoGroups: string[]; // Raw Cognito groups
  // Legacy fields maintained for backward compatibility
  role: string; // Primary role (backward compatibility)
}
```

## Migration Strategy

### Feature Flag Support

The system supports both Cognito and legacy authentication via the `AUTH_PROVIDER` environment variable:

- `AUTH_PROVIDER=cognito`: Uses Cognito authentication
- `AUTH_PROVIDER=legacy`: Uses existing JWT authentication

### Backward Compatibility

- Legacy JWT endpoints remain available when `AUTH_PROVIDER=legacy`
- User model maintains backward compatibility
- Existing middleware continues to work

## Testing

### Unit Tests

- PKCE state validation
- JWKS key rotation handling
- Role mapping functionality
- Session management

### Integration Tests

- Complete OAuth flow
- Session persistence
- Role-based access control
- Password reset flow

### Security Tests

- CSRF protection
- Rate limiting
- Session security
- Token validation

## Deployment Considerations

### Environment Setup

1. **Development**: Memory store for sessions
2. **Staging**: Redis for session storage
3. **Production**: Redis with clustering

### Monitoring

- Authentication success/failure rates
- Session creation/destruction
- Rate limit violations
- Security events

### Operational Notes

- Rotate `SESSION_SECRET` regularly
- Monitor Redis connection health
- Set up Cognito CloudWatch alarms
- Implement session cleanup jobs

## Troubleshooting

### Common Issues

#### "Invalid token: Unable to verify signature"

- Check JWKS URL accessibility
- Verify Cognito region configuration
- Ensure user pool ID is correct

#### "Session not found"

- Check Redis connection
- Verify session TTL settings
- Check cookie configuration

#### "CSRF token required"

- Ensure CSRF tokens are included in requests
- Check SameSite cookie settings
- Verify state parameter in OAuth flow

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` to see detailed authentication flow information.

## Security Best Practices

1. **Never expose tokens to frontend**
2. **Use HTTPS in production**
3. **Implement proper CORS policies**
4. **Monitor authentication events**
5. **Regular security audits**
6. **Keep dependencies updated**
7. **Use strong session secrets**
8. **Implement proper error handling**

## Future Enhancements

1. **MFA Integration**: Add multi-factor authentication
2. **Device Management**: Track and manage user devices
3. **Advanced Analytics**: Authentication pattern analysis
4. **Custom Attributes**: Support for custom user attributes
5. **Federation**: Integration with enterprise identity providers
