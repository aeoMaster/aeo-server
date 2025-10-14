# Clarity Scanner API Documentation

## Overview

The Clarity Scanner is an advanced AEO (Answer Engine Optimization) content analysis tool that performs rule-based DOM analysis to evaluate content clarity and structure for better visibility in AI-powered search engines.

## Base URL

```
http://localhost:8080/api/clarity-scan
```

## Endpoints

### 1. Scan URL

**Endpoint:** `GET /scan`

**Description:** Analyzes a public URL and returns detailed AEO audit results.

**Query Parameters:**

- `url` (required): The URL to scan (must be a valid HTTP/HTTPS URL)

**Example Request:**

```bash
GET /api/clarity-scan/scan?url=https://example.com
```

**Response:**

```json
{
  "url": "https://example.com",
  "title": "Example Page Title",
  "globalScore": 75,
  "issues": [
    {
      "group": "Structure",
      "title": "Missing H1 Tag",
      "status": "fail",
      "details": "No H1 tag found on the page",
      "recommendation": "Add exactly one H1 tag with your main page title",
      "selectorExample": null
    }
  ],
  "summaryByCategory": {
    "Structure": {
      "score": 60,
      "passed": ["Semantic HTML tags present"],
      "failed": ["Missing H1 tag"],
      "recommendations": ["Add semantic HTML5 tags"],
      "issues": [...]
    },
    "Meta": {
      "score": 85,
      "passed": ["Title length optimal", "Search engines allowed"],
      "failed": [],
      "recommendations": ["Add Open Graph tags"],
      "issues": [...]
    },
    "Schema": {
      "score": 40,
      "passed": ["1 valid schema(s) found"],
      "failed": ["No structured data"],
      "recommendations": ["Add FAQ schema"],
      "issues": [...]
    },
    "Navigation": {
      "score": 70,
      "passed": ["5 anchor links found"],
      "failed": [],
      "recommendations": ["Add breadcrumb navigation", "Add skip navigation links"],
      "issues": [...]
    },
    "Content": {
      "score": 80,
      "passed": ["1200 words of content", "Good paragraph length"],
      "failed": [],
      "recommendations": ["Add content emphasis"],
      "issues": [...]
    },
    "Links": {
      "score": 90,
      "passed": ["15 internal links", "8 external links", "Good anchor text quality"],
      "failed": [],
      "recommendations": [],
      "issues": [...]
    }
  },
  "createdAt": "2025-07-02T12:00:00.000Z",
  "updatedAt": "2025-07-02T12:00:00.000Z"
}
```

### 2. Get Scan by ID

**Endpoint:** `GET /scan/:id`

**Description:** Retrieves a specific scan result by ID.

**Path Parameters:**

- `id` (required): The scan ID

**Example Request:**

```bash
GET /api/clarity-scan/scan/507f1f77bcf86cd799439011
```

**Response:** Same as scan URL response

### 3. Get Scan History (Authenticated)

**Endpoint:** `GET /history`

**Description:** Retrieves scan history for the authenticated user.

**Headers:**

- `Authorization: Bearer <token>` (required)

**Query Parameters:**

- `limit` (optional): Number of scans to return (default: 10)

**Example Request:**

```bash
GET /api/clarity-scan/history?limit=5
Authorization: Bearer <your-token>
```

**Response:**

```json
[
  {
    "url": "https://example.com",
    "title": "Example Page Title",
    "globalScore": 75,
    "createdAt": "2025-07-02T12:00:00.000Z",
    "updatedAt": "2025-07-02T12:00:00.000Z"
  }
]
```

### 4. Get Scan with HTML (Authenticated)

**Endpoint:** `GET /scan/:id/html`

**Description:** Retrieves a scan result including the HTML snapshot.

**Headers:**

- `Authorization: Bearer <token>` (required)

**Path Parameters:**

- `id` (required): The scan ID

**Example Request:**

```bash
GET /api/clarity-scan/scan/507f1f77bcf86cd799439011/html
Authorization: Bearer <your-token>
```

**Response:** Same as scan URL response but includes `htmlSnapshot` field

### 5. Delete Scan (Authenticated)

**Endpoint:** `DELETE /scan/:id`

**Description:** Deletes a scan result (only for the authenticated user).

**Headers:**

- `Authorization: Bearer <token>` (required)

**Path Parameters:**

- `id` (required): The scan ID

**Example Request:**

```bash
DELETE /api/clarity-scan/scan/507f1f77bcf86cd799439011
Authorization: Bearer <your-token>
```

**Response:**

```json
{
  "message": "Scan deleted successfully"
}
```

## Analysis Categories

### 1. Structure

- H1 tag presence and count
- Heading hierarchy validation
- Semantic HTML tag usage
- Div usage analysis

### 2. Meta

- Title tag presence and length
- Meta description presence and length
- Robots meta tag analysis
- Open Graph tag presence

### 3. Schema

- JSON-LD structured data validation
- Schema type identification
- FAQ schema presence
- Malformed schema detection

### 4. Navigation

- In-page anchor links
- Breadcrumb navigation
- Skip navigation links
- Navigation depth analysis

### 5. Content

- Word count analysis
- Paragraph length evaluation
- Content emphasis tags
- Thin content detection

### 6. Links

- Internal vs external link ratio
- Anchor text quality
- Broken link detection
- Link distribution analysis

## Scoring System

- **Global Score:** 0-100 (average of all category scores)
- **Category Score:** 0-100 (weighted based on passed/failed/recommendations)
- **Status Types:**
  - `pass`: Meets best practices
  - `fail`: Critical issue that needs immediate attention
  - `warning`: Improvement opportunity

## Error Responses

### 400 Bad Request

```json
{
  "status": "error",
  "message": "Invalid URL format"
}
```

### 404 Not Found

```json
{
  "message": "Scan not found"
}
```

### 401 Unauthorized

```json
{
  "message": "Authentication required"
}
```

### 500 Internal Server Error

```json
{
  "status": "error",
  "message": "Failed to scan URL"
}
```

## Usage Examples

### Frontend Integration

```javascript
// Scan a URL
const scanUrl = async (url) => {
  try {
    const response = await fetch(
      `/api/clarity-scan/scan?url=${encodeURIComponent(url)}`
    );
    const result = await response.json();

    console.log(`Global Score: ${result.globalScore}`);
    console.log(`Issues Found: ${result.issues.length}`);

    // Display category scores
    Object.entries(result.summaryByCategory).forEach(([category, data]) => {
      console.log(`${category}: ${data.score}/100`);
    });

    return result;
  } catch (error) {
    console.error("Scan failed:", error);
  }
};

// Get scan history
const getHistory = async () => {
  try {
    const response = await fetch("/api/clarity-scan/history", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const history = await response.json();
    return history;
  } catch (error) {
    console.error("Failed to get history:", error);
  }
};
```

## Best Practices

1. **URL Validation:** Always validate URLs before scanning
2. **Rate Limiting:** Implement rate limiting for production use
3. **Caching:** Consider caching results for frequently scanned URLs
4. **Error Handling:** Handle network errors and invalid URLs gracefully
5. **User Feedback:** Show loading states during scan operations

## Performance Notes

- Scans typically take 2-5 seconds depending on page size
- HTML snapshots are stored but excluded from regular API responses
- Broken link checking is limited to first 10 external links
- Large pages may take longer to analyze
