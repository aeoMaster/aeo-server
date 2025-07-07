# Reddit Seed Post Generator Setup Guide

## 1. Reddit API Configuration

### Step 1: Create Reddit App

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Fill in the details:
   - **Name**: `AEO-Reddit-Bot` (or your preferred name)
   - **Type**: Select "script"
   - **Description**: "Reddit seed post generator for AEO discussions"
   - **About URL**: Your website URL
   - **Redirect URI**: `http://localhost:3000/auth/reddit/callback` (for development)

### Step 2: Get Your Credentials

After creating the app, you'll get:

- **Client ID**: The string under your app name
- **Client Secret**: The "secret" field

## 2. Environment Variables

Add these to your `.env` file:

```env
# Reddit API Configuration
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USERNAME_1=your_reddit_username
REDDIT_ACCESS_TOKEN_1=your_reddit_access_token
REDDIT_REFRESH_TOKEN_1=your_reddit_refresh_token
REDDIT_EXPIRES_AT_1=2024-12-31T23:59:59.000Z
REDDIT_KARMA_1=1000
REDDIT_ACCOUNT_AGE_1=365
```

## 3. Getting Reddit Access Tokens

### Method 1: Using Reddit's OAuth Flow (Recommended)

1. Use Reddit's OAuth2 flow to get access tokens
2. The tokens expire every hour, so you'll need to refresh them
3. Store the refresh token to get new access tokens

### Method 2: Manual Token Generation (For Testing)

1. Go to https://www.reddit.com/api/v1/authorize
2. Add parameters:
   - `client_id`: Your client ID
   - `response_type`: `token`
   - `state`: `random_string`
   - `redirect_uri`: Your redirect URI
   - `scope`: `submit identity read`
3. Authorize and copy the access token from the URL

## 4. Account Requirements

For best results, your Reddit account should have:

- **Karma**: At least 100+ (higher is better)
- **Account Age**: At least 30+ days old
- **Post History**: Some legitimate posts/comments
- **No Recent Suspensions**: Clean account history

## 5. Testing the Setup

Once configured, you can test with:

```bash
# Test the API endpoints
curl -X POST http://localhost:3000/api/reddit/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "targetSubreddit": "SEO",
    "topicKeywords": ["AI SEO", "site indexing"],
    "productContext": "A platform that helps websites get indexed faster by Google using AI.",
    "tone": "frustrated"
  }'
```

## 6. Important Notes

- **Subreddit Whitelist**: Only certain subreddits are allowed (see `/api/reddit/subreddit-suggestions`)
- **Rate Limiting**: Reddit has rate limits, so don't post too frequently
- **Account Rotation**: Consider using multiple accounts to avoid spam detection
- **Content Quality**: Posts should be genuine and valuable to the community
- **No Links**: Don't include links in the post body to avoid spam flags

## 7. Troubleshooting

### Common Issues:

1. **401 Unauthorized**: Check your access token and make sure it's valid
2. **403 Forbidden**: Your account might not have permission to post in that subreddit
3. **429 Rate Limited**: You're posting too frequently, wait before trying again
4. **Subreddit Not Allowed**: Check the whitelist of allowed subreddits

### Getting Help:

- Check Reddit's API documentation: https://www.reddit.com/dev/api/
- Verify your app settings at https://www.reddit.com/prefs/apps
- Test with a small subreddit first before posting to larger ones
