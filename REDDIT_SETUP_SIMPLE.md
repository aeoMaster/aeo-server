# Reddit Setup - Simplified Client Credentials Flow

This guide shows how to set up Reddit posting using client credentials flow (no user OAuth required).

## Environment Variables

Add these to your `.env` file:

```env
# Reddit API Credentials (Required)
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
```

## How It Works

The system now uses **client credentials flow** which means:

- ✅ No user OAuth required
- ✅ No refresh tokens needed
- ✅ Automatically generates new access tokens
- ✅ Works with just client ID and secret
- ✅ Falls back to demo mode if credentials are missing

## Getting Your Reddit API Credentials

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Fill in the details:
   - **Name**: AEO Reddit Bot
   - **Type**: Script
   - **Description**: Reddit posting bot for content marketing
   - **About URL**: (leave blank)
   - **Redirect URI**: http://localhost:8080/callback (or any valid URL)
4. Click "Create App"
5. Copy the **Client ID** (the string under your app name)
6. Copy the **Client Secret** (the longer string)

## Testing the Setup

1. Add your credentials to `.env`
2. Restart your server
3. Test with a simple post:

```bash
curl -X POST http://localhost:3000/api/reddit/post \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "targetSubreddit": "SEO",
    "topicKeywords": ["SEO", "content optimization"],
    "productContext": "AI-powered content analysis tool"
  }'
```

## What Happens

1. **Token Generation**: System automatically generates a new access token using your client credentials
2. **Posting**: Posts content to the specified subreddit
3. **Fallback**: If anything fails, falls back to demo mode (simulates posting)

## Available Endpoints

- `POST /api/reddit/post` - Create a new post
- `GET /api/reddit/history` - Get post history
- `GET /api/reddit/status` - Check Reddit connection status
- `DELETE /api/reddit/post/:id` - Delete a post

## Demo Mode

If no credentials are provided or if Reddit API fails, the system automatically falls back to demo mode:

- Simulates successful posting
- Returns demo URLs
- Logs demo activity
- No actual posts are made to Reddit

This ensures your application always works, even during development or if Reddit API is temporarily unavailable.
