# Team Members Tracking Feature

## Overview

The team members tracking feature allows you to monitor and limit the number of team members in a company account. This feature is integrated with the existing usage system and respects the `maxUsers` limit defined in each package.

## Features

### ✅ Core Functionality

- **Real-time member counting** - Automatically tracks current team member count
- **Limit enforcement** - Prevents adding members beyond package limits
- **Usage integration** - Integrated with existing usage tracking system
- **Company-specific** - Only applies to company accounts (not individual users)

### 📊 Usage Tracking

- **Current count** - Shows how many members are currently in the team
- **Remaining slots** - Shows how many more members can be added
- **Limit information** - Shows the maximum allowed members for the package

## API Endpoints

### 1. Track Members Usage

**Endpoint:** `POST /api/usage/track`

**Description:** Track team members usage (used when adding/removing members)

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "type": "members",
  "amount": 1
}
```

**Response:**

```json
{
  "type": "members",
  "current": 3,
  "limit": 5,
  "remaining": 2
}
```

### 2. Get Current Usage (includes members)

**Endpoint:** `GET /api/usage/current`

**Description:** Get current usage including team members count

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "analysis": {
    "used": 15,
    "remaining": 35,
    "total": 50
  },
  "clarity_scan": {
    "used": 20,
    "remaining": 60,
    "total": 80
  },
  "chat_message": {
    "used": 50,
    "remaining": 150,
    "total": 200
  },
  "members": {
    "used": 3,
    "remaining": 2,
    "total": 5
  }
}
```

### 3. Get Usage History

**Endpoint:** `GET /api/usage/history?type=members`

**Description:** Get usage history for team members

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

- `type=members` - Filter for members usage
- `page=1` - Page number (optional)
- `limit=10` - Items per page (optional)

## Package Limits

| Package        | Max Users | Description          |
| -------------- | --------- | -------------------- |
| **Free**       | 1         | Individual user only |
| **Starter**    | 1         | Individual user only |
| **Growth**     | 3         | Small team           |
| **Pro**        | 5         | Medium team          |
| **Business**   | 10        | Large team           |
| **Enterprise** | Unlimited | No limit             |

## Usage Examples

### Frontend Integration

```javascript
// Check if user can add more members
const checkMemberLimit = async () => {
  try {
    const response = await fetch("/api/usage/current", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const usage = await response.json();

    const membersUsage = usage.members;

    if (membersUsage.remaining > 0 || membersUsage.remaining === -1) {
      console.log(`Can add ${membersUsage.remaining} more members`);
      return true;
    } else {
      console.log("Cannot add more members - limit reached");
      return false;
    }
  } catch (error) {
    console.error("Error checking member limit:", error);
    return false;
  }
};

// Track member addition
const addMember = async (memberData) => {
  try {
    // First check if we can add a member
    const canAdd = await checkMemberLimit();
    if (!canAdd) {
      throw new Error("Member limit reached");
    }

    // Add the member to your system
    const memberResponse = await fetch("/api/company/members", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(memberData),
    });

    // Track the usage
    await fetch("/api/usage/track", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "members",
        amount: 1,
      }),
    });

    console.log("Member added successfully");
  } catch (error) {
    console.error("Error adding member:", error);
  }
};
```

### Backend Integration

```javascript
// Middleware to check member limits before adding members
import { checkUsage } from "../middleware/usageCheck";

// Apply to member addition routes
router.post(
  "/members",
  authenticate,
  checkUsage("members"),
  addMemberController
);

// In your controller
const addMemberController = async (req, res) => {
  try {
    // Your member addition logic here

    // Track the usage
    await UsageService.trackUsage(
      req.user._id,
      req.user.company?._id,
      "members",
      1
    );

    res.json({ success: true, message: "Member added successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
```

## Error Handling

### Common Error Responses

**403 - Limit Exceeded:**

```json
{
  "status": "error",
  "message": "Adding members would exceed the team limit"
}
```

**400 - Missing Company:**

```json
{
  "status": "error",
  "message": "Company ID is required for members tracking"
}
```

**404 - No Subscription:**

```json
{
  "status": "error",
  "message": "No active subscription found"
}
```

## Implementation Notes

### How It Works

1. **Member Counting**: The system counts all users associated with a company
2. **Limit Checking**: Before adding members, it checks against the package's `maxUsers` limit
3. **Usage Tracking**: When members are added/removed, it tracks the usage
4. **Real-time Updates**: Usage is updated in real-time when members are modified

### Database Schema

The system uses the existing `User` model with a `company` field to track team membership:

```javascript
// User model
{
  _id: ObjectId,
  email: String,
  company: ObjectId, // Reference to company
  // ... other fields
}

// Usage model (for tracking)
{
  user: ObjectId,
  company: ObjectId,
  type: "members",
  count: Number,
  period: {
    start: Date,
    end: Date
  },
  limits: {
    total: Number,
    used: Number,
    remaining: Number
  }
}
```

### Security Considerations

- **Authentication Required**: All endpoints require valid JWT tokens
- **Company Isolation**: Users can only access their own company's member data
- **Role-based Access**: Admin roles may be required for member management
- **Rate Limiting**: Consider implementing rate limiting for member operations

## Testing

Use the provided test script to verify the functionality:

```bash
# Update the token in the test file
node test-members-tracking.js
```

## Migration Notes

If you're upgrading from a system without member tracking:

1. **Existing Users**: Current member counts will be automatically calculated
2. **No Data Loss**: Existing user-company relationships are preserved
3. **Backward Compatibility**: Existing APIs continue to work
4. **Gradual Rollout**: Can be enabled per company or globally

## Support

For questions or issues with team members tracking:

1. Check the usage logs for detailed error messages
2. Verify the user's subscription and package limits
3. Ensure the company ID is properly set for company users
4. Check that the user has the necessary permissions
