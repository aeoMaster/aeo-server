# Environment Variables Setup Guide

This guide explains how to configure all environment variables for your application.

## 📋 Environment Variables Overview

### Required for Basic Operation

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `MONGODB_URI` - Database connection string
- `JWT_SECRET` - JWT signing secret

### Required for Authentication

- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `LINKEDIN_CLIENT_ID` - LinkedIn OAuth client ID
- `LINKEDIN_CLIENT_SECRET` - LinkedIn OAuth client secret

### Required for AI Features

- `OPENAI_API_KEY` - OpenAI API key

### Required for Payments

- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret

### Required for Email

- `SENDGRID_API_KEY` - SendGrid API key
- `SENDGRID_FROM_EMAIL` - From email address

### Required for Performance Monitoring

- `PAGESPEED_API_KEY` - Google PageSpeed Insights API key

### Required for Frontend Integration

- `CLIENT_URL` - Frontend application URL
- `FRONTEND_URL` - Frontend application URL

## 🚀 Quick Setup

### 1. Local Development

Copy the template and configure:

```bash
cp env.template .env
```

Edit `.env` with your values:

```bash
# Required for basic operation
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/your-database
JWT_SECRET=your-super-secret-jwt-key-here

# Required for authentication
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Required for AI features
OPENAI_API_KEY=your-openai-api-key

# Required for payments
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Required for email
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Required for performance monitoring
PAGESPEED_API_KEY=your-pagespeed-api-key

# Required for frontend integration
CLIENT_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

### 2. Production (Elastic Beanstalk)

Set these in your Elastic Beanstalk environment:

#### Application Configuration

```
NODE_ENV=production
PORT=8080
```

#### Database Configuration

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

#### Authentication & Security

```
JWT_SECRET=your-production-jwt-secret-make-it-long-and-random
JWT_EXPIRES_IN=7d
```

#### OAuth Configuration

```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-domain.com/api/auth/google/callback

LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_REDIRECT_URI=https://your-domain.com/api/oauth/linkedin/callback
```

#### Frontend URLs

```
CLIENT_URL=https://your-frontend-domain.com
FRONTEND_URL=https://your-frontend-domain.com
```

#### AI Configuration

```
OPENAI_API_KEY=your-openai-api-key
```

#### Payment Configuration

```
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
```

#### Email Configuration

```
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_TEMPLATE_IDS={"welcome":"d-template-id","invite":"d-template-id","reset":"d-template-id"}
USE_MOCK_EMAIL=false
```

#### Performance Monitoring

```
PAGESPEED_API_KEY=your-pagespeed-api-key
```

## 🔧 Service Setup Instructions

### 1. MongoDB Setup

1. Create a MongoDB Atlas account or use local MongoDB
2. Create a database
3. Get the connection string
4. Set `MONGODB_URI` with the connection string

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - Development: `http://localhost:5000/api/auth/google/callback`
   - Production: `https://your-domain.com/api/auth/google/callback`
6. Copy Client ID and Client Secret

### 3. LinkedIn OAuth Setup

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create a new app
3. Add OAuth 2.0 redirect URLs:
   - Development: `http://localhost:5000/api/oauth/linkedin/callback`
   - Production: `https://your-domain.com/api/oauth/linkedin/callback`
4. Copy Client ID and Client Secret

### 4. OpenAI Setup

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account
3. Generate an API key
4. Copy the API key

### 5. Stripe Setup

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Create an account
3. Get your API keys (Publishable and Secret)
4. Set up webhooks for subscription events
5. Copy the webhook secret

### 6. SendGrid Setup

1. Go to [SendGrid](https://sendgrid.com/)
2. Create an account
3. Generate an API key
4. Verify your sender email
5. Create email templates (optional)
6. Copy the API key and template IDs

### 7. Google PageSpeed Insights Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable PageSpeed Insights API
3. Create credentials
4. Copy the API key

## 🔐 Security Best Practices

### JWT Secret

- Use a long, random string (at least 32 characters)
- Generate using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Database Connection

- Use connection strings with authentication
- Enable SSL for production
- Use environment-specific databases

### API Keys

- Never commit API keys to version control
- Use different keys for development and production
- Rotate keys regularly

### OAuth Configuration

- Use different OAuth apps for development and production
- Set proper redirect URIs
- Enable security features (2FA, etc.)

## 🧪 Testing Environment Variables

### Test Health Endpoints

```bash
npm run test:health-all
```

### Test Database Connection

```bash
npm run dev
# Check console for MongoDB connection status
```

### Test OAuth Configuration

```bash
# Test Google OAuth
curl http://localhost:5000/api/auth/google

# Test LinkedIn OAuth
curl http://localhost:5000/api/oauth/linkedin/auth-url
```

## 🚨 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**

   - Check connection string format
   - Verify network access
   - Check authentication credentials

2. **OAuth Redirect URI Mismatch**

   - Ensure redirect URIs match exactly
   - Check for trailing slashes
   - Verify protocol (http vs https)

3. **JWT Token Issues**

   - Verify JWT_SECRET is set
   - Check token expiration
   - Ensure consistent secret across instances

4. **Email Not Sending**

   - Check SendGrid API key
   - Verify sender email is verified
   - Check template IDs if using templates

5. **Stripe Webhook Issues**
   - Verify webhook endpoint URL
   - Check webhook secret
   - Ensure proper event types are configured

### Environment Variable Validation

Add this to your application startup to validate required variables:

```typescript
const requiredEnvVars = [
  "MONGODB_URI",
  "JWT_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "OPENAI_API_KEY",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}
```

## 📝 Environment Variable Reference

| Variable                 | Required | Description                  | Example                                |
| ------------------------ | -------- | ---------------------------- | -------------------------------------- |
| `NODE_ENV`               | Yes      | Environment mode             | `development` or `production`          |
| `PORT`                   | Yes      | Server port                  | `5000` or `8080`                       |
| `MONGODB_URI`            | Yes      | Database connection string   | `mongodb://localhost:27017/db`         |
| `JWT_SECRET`             | Yes      | JWT signing secret           | `your-secret-key`                      |
| `GOOGLE_CLIENT_ID`       | Yes      | Google OAuth client ID       | `123456789.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET`   | Yes      | Google OAuth client secret   | `your-client-secret`                   |
| `LINKEDIN_CLIENT_ID`     | Yes      | LinkedIn OAuth client ID     | `your-linkedin-client-id`              |
| `LINKEDIN_CLIENT_SECRET` | Yes      | LinkedIn OAuth client secret | `your-linkedin-client-secret`          |
| `OPENAI_API_KEY`         | Yes      | OpenAI API key               | `sk-...`                               |
| `STRIPE_SECRET_KEY`      | Yes      | Stripe secret key            | `sk_test_...`                          |
| `STRIPE_WEBHOOK_SECRET`  | Yes      | Stripe webhook secret        | `whsec_...`                            |
| `SENDGRID_API_KEY`       | Yes      | SendGrid API key             | `SG...`                                |
| `SENDGRID_FROM_EMAIL`    | Yes      | From email address           | `noreply@domain.com`                   |
| `PAGESPEED_API_KEY`      | No       | PageSpeed API key            | `AIza...`                              |
| `CLIENT_URL`             | Yes      | Frontend URL                 | `http://localhost:3000`                |
| `FRONTEND_URL`           | Yes      | Frontend URL                 | `http://localhost:3000`                |
