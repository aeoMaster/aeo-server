# Blog & Cross-Posting Feature

## Overview

This feature allows users to create, manage, and publish blog posts with cross-platform publishing capabilities to LinkedIn and Medium.

## Features

### 🎯 Core Blog Features

- **Create Drafts**: Save blog posts as drafts
- **Publish Posts**: Publish drafts to make them public
- **Rich Content**: Support for HTML content, tags, excerpts
- **SEO Optimization**: Meta titles, descriptions, and keywords
- **View Tracking**: Automatic view count tracking
- **Search & Filter**: Search by title, content, tags
- **Pagination**: Efficient pagination for large datasets

### 🌐 Cross-Platform Publishing

- **LinkedIn Integration**: Publish directly to LinkedIn
- **Medium Integration**: Publish directly to Medium
- **OAuth Authentication**: Secure platform connections
- **Publish Status Tracking**: Monitor publishing success/failure
- **Error Handling**: Detailed error messages for failed publishes

## API Endpoints

### Blog Management

#### Create Blog Post

```http
POST /api/blogs
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My Blog Post",
  "content": "<h1>Hello World</h1><p>This is my content...</p>",
  "excerpt": "A brief summary of the post",
  "tags": ["technology", "programming"],
  "seoData": {
    "metaTitle": "SEO Title",
    "metaDescription": "SEO Description",
    "keywords": ["keyword1", "keyword2"]
  },
  "featuredImage": "https://example.com/image.jpg"
}
```

#### Get User's Blogs

```http
GET /api/blogs?status=draft&page=1&limit=10&search=keyword&tags=tech,programming
Authorization: Bearer <token>
```

#### Get Single Blog

```http
GET /api/blogs/:id
Authorization: Bearer <token>
```

#### Update Blog

```http
PUT /api/blogs/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content..."
}
```

#### Delete Blog

```http
DELETE /api/blogs/:id
Authorization: Bearer <token>
```

#### Publish Blog

```http
POST /api/blogs/:id/publish
Authorization: Bearer <token>
Content-Type: application/json

{
  "platforms": ["linkedin", "medium"]
}
```

#### Get Publish Status

```http
GET /api/blogs/:id/publish-status
Authorization: Bearer <token>
```

#### Get Blog Statistics

```http
GET /api/blogs/stats
Authorization: Bearer <token>
```

### Public Blog Access

#### Get Public Blogs

```http
GET /api/blogs/public?page=1&limit=10&search=keyword&tags=tech&author=userId
```

#### Get Single Public Blog

```http
GET /api/blogs/public/:id
```

### OAuth Platform Integration

#### Get LinkedIn Auth URL

```http
GET /api/oauth/linkedin/auth-url
Authorization: Bearer <token>
```

#### LinkedIn Callback

```http
GET /api/oauth/linkedin/callback?code=<code>&state=<userId>
```

#### Get Medium Auth URL

```http
GET /api/oauth/medium/auth-url
Authorization: Bearer <token>
```

#### Medium Callback

```http
GET /api/oauth/medium/callback?code=<code>&state=<userId>
```

#### Get Connected Platforms

```http
GET /api/oauth/platforms
Authorization: Bearer <token>
```

#### Disconnect Platform

```http
DELETE /api/oauth/platforms/:platform
Authorization: Bearer <token>
```

## Database Models

### Blog Model

```typescript
interface IBlog {
  title: string;
  content: string;
  excerpt?: string;
  tags: string[];
  author: ObjectId;
  status: "draft" | "published" | "archived";
  publishedAt?: Date;
  source: "linkedin" | "medium" | "custom" | "crosspost";
  externalLinks: {
    linkedin?: string;
    medium?: string;
  };
  publishStatus: {
    linkedin?: "pending" | "success" | "failed";
    medium?: "pending" | "success" | "failed";
  };
  publishErrors: {
    linkedin?: string;
    medium?: string;
  };
  seoData?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  featuredImage?: string;
  readTime?: number;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### PlatformToken Model

```typescript
interface IPlatformToken {
  user: ObjectId;
  platform: "linkedin" | "medium" | "twitter" | "facebook";
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  platformUserId?: string;
  platformUsername?: string;
  isActive: boolean;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## Environment Variables

Add these to your `.env` file for OAuth integration:

```env
# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:8080/api/oauth/linkedin/callback

# Medium OAuth
MEDIUM_CLIENT_ID=your_medium_client_id
MEDIUM_CLIENT_SECRET=your_medium_client_secret
MEDIUM_REDIRECT_URI=http://localhost:8080/api/oauth/medium/callback
```

## Usage Examples

### 1. Create and Publish a Blog Post

```javascript
// 1. Create a draft
const draft = await fetch("/api/blogs", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    title: "How AEO is Changing SEO",
    content: "<h1>Introduction</h1><p>Content here...</p>",
    tags: ["seo", "aeo", "ai"],
  }),
});

// 2. Publish to LinkedIn and Medium
const publish = await fetch(`/api/blogs/${draft.id}/publish`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    platforms: ["linkedin", "medium"],
  }),
});

// 3. Check publish status
const status = await fetch(`/api/blogs/${draft.id}/publish-status`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

### 2. Connect LinkedIn Account

```javascript
// 1. Get auth URL
const authUrl = await fetch("/api/oauth/linkedin/auth-url", {
  headers: { Authorization: `Bearer ${token}` },
});

// 2. Redirect user to LinkedIn
window.location.href = authUrl.authUrl;

// 3. Handle callback (LinkedIn will redirect back)
// The callback endpoint will automatically save the token
```

## Response Examples

### Blog List Response

```json
{
  "blogs": [
    {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "title": "How AEO is Changing SEO",
      "excerpt": "A brief summary...",
      "status": "published",
      "publishedAt": "2025-06-30T10:00:00.000Z",
      "tags": ["seo", "aeo"],
      "viewCount": 150,
      "readTime": 5,
      "publishStatus": {
        "linkedin": "success",
        "medium": "pending"
      },
      "externalLinks": {
        "linkedin": "https://www.linkedin.com/feed/update/urn:li:activity:123/"
      },
      "author": {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b4",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "pages": 3
  }
}
```

### Publish Status Response

```json
{
  "publishStatus": {
    "linkedin": "success",
    "medium": "failed"
  },
  "publishErrors": {
    "medium": "Token expired"
  },
  "externalLinks": {
    "linkedin": "https://www.linkedin.com/feed/update/urn:li:activity:123/"
  }
}
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found (blog doesn't exist)
- `500` - Internal Server Error (server issues)

Error response format:

```json
{
  "status": "error",
  "message": "Error description",
  "code": 400
}
```

## Security Features

- **Authentication Required**: All blog management endpoints require valid JWT tokens
- **Author-only Access**: Users can only access their own blogs
- **Public Read-only**: Published blogs are publicly readable
- **OAuth Security**: Secure token storage and refresh handling
- **Input Validation**: Comprehensive input validation using Zod schemas
