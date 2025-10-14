# API Endpoints Reference

## Blog Management Endpoints

### Create Blog

```http
POST /api/blogs
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Blog Title",
  "content": "Blog content...",
  "excerpt": "Brief summary",
  "tags": ["tag1", "tag2"],
  "featuredImage": "https://example.com/image.jpg",
  "seoData": {
    "metaTitle": "SEO Title",
    "metaDescription": "SEO Description",
    "keywords": ["keyword1", "keyword2"]
  }
}
```

### Get User's Blogs

```http
GET /api/blogs?status=draft&page=1&limit=10&search=keyword&tags=tech
Authorization: Bearer <token>
```

### Get Single Blog

```http
GET /api/blogs/:blogId
Authorization: Bearer <token>
```

### Update Blog

```http
PUT /api/blogs/:blogId
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content..."
}
```

### Delete Blog

```http
DELETE /api/blogs/:blogId
Authorization: Bearer <token>
```

### Publish Blog

```http
POST /api/blogs/:blogId/publish
Authorization: Bearer <token>
Content-Type: application/json

{
  "platforms": ["linkedin", "medium"]
}
```

### Get Publish Status

```http
GET /api/blogs/:blogId/publish-status
Authorization: Bearer <token>
```

### Get Blog Statistics

```http
GET /api/blogs/stats
Authorization: Bearer <token>
```

## OAuth Platform Integration Endpoints

### Get LinkedIn Auth URL

```http
GET /api/oauth/linkedin/auth-url
Authorization: Bearer <token>
```

### LinkedIn Callback

```http
GET /api/oauth/linkedin/callback?code=<code>&state=<userId>
```

### Get Medium Auth URL

```http
GET /api/oauth/medium/auth-url
Authorization: Bearer <token>
```

### Medium Callback

```http
GET /api/oauth/medium/callback?code=<code>&state=<userId>
```

### Get Connected Platforms ⭐

```http
GET /api/oauth/platforms
Authorization: Bearer <token>
```

### Disconnect Platform

```http
DELETE /api/oauth/platforms/:platform
Authorization: Bearer <token>
```

## Public Blog Access

### Get Public Blogs

```http
GET /api/blogs/public?page=1&limit=10&search=keyword&tags=tech&author=userId
```

### Get Single Public Blog

```http
GET /api/blogs/public/:blogId
```

## Common Issues & Solutions

### Issue: 500 Error on `/api/blogs/platforms`

**Problem**: You're trying to access `/api/blogs/platforms` which doesn't exist.

**Solution**: Use `/api/oauth/platforms` instead.

### Issue: Invalid ObjectId Error

**Problem**: The blog ID format is invalid.

**Solution**: Make sure you're using a valid MongoDB ObjectId (24 character hex string).

### Issue: Blog Not Found

**Problem**: The blog doesn't exist or you don't have permission to access it.

**Solution**:

1. Check if the blog ID is correct
2. Verify you're the author of the blog
3. For public access, make sure the blog is published

## Testing Your Blog Creation

1. **Create a blog**:

```bash
curl -X POST http://localhost:8080/api/blogs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Blog",
    "content": "This is a test blog post",
    "tags": ["test"]
  }'
```

2. **Get your blogs**:

```bash
curl -X GET http://localhost:8080/api/blogs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. **Get connected platforms**:

```bash
curl -X GET http://localhost:8080/api/oauth/platforms \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Response Examples

### Successful Blog Creation

```json
{
  "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
  "title": "Test Blog",
  "content": "This is a test blog post",
  "status": "draft",
  "author": "60f7b3b3b3b3b3b3b3b3b3b4",
  "createdAt": "2025-06-30T10:00:00.000Z",
  "updatedAt": "2025-06-30T10:00:00.000Z"
}
```

### Connected Platforms Response

```json
[
  {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b5",
    "platform": "linkedin",
    "platformUsername": "John Doe",
    "lastUsed": "2025-06-30T10:00:00.000Z"
  }
]
```

### Error Response

```json
{
  "status": "error",
  "message": "Blog not found",
  "code": 404
}
```
