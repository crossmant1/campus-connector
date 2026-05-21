# CampusConnect API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Auth Endpoints

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "student@university.edu",
  "password": "SecurePass123!",
  "name": "John Doe",
  "university": "University Name"
}
```

**Response:** 201 Created
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "userId": "uuid"
}
```

#### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "student@university.edu",
  "password": "SecurePass123!"
}
```

**Response:** 200 OK
```json
{
  "message": "Login successful",
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "user": {
    "id": "uuid",
    "email": "student@university.edu",
    "role": "student"
  }
}
```

#### GET /auth/verify-email?token=<token>
Verify email address.

#### POST /auth/request-password-reset
Request password reset email.

#### POST /auth/reset-password
Reset password with token.

#### POST /auth/refresh-token
Get new access token using refresh token.

#### POST /auth/logout
Logout and blacklist current token.

#### GET /auth/me
Get current user information (requires authentication).

## Profile Endpoints

#### GET /profile/:userId
Get user profile by ID.

#### PUT /profile
Update current user's profile.

**Request Body:**
```json
{
  "name": "John Doe",
  "bio": "Computer Science student",
  "university": "University Name",
  "department": "Computer Science",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "github_url": "https://github.com/johndoe",
  "graduation_year": 2025
}
```

#### POST /profile/skills
Add skill to profile.

**Request Body:**
```json
{
  "skillName": "JavaScript",
  "proficiencyLevel": "advanced"
}
```

#### DELETE /profile/skills/:skillId
Remove skill from profile.

#### POST /profile/courses
Add course to profile.

#### POST /profile/interests
Add interest to profile.

## Matching Endpoints

#### GET /matching/suggestions?limit=10
Get suggested connections based on matching algorithm.

#### GET /matching/study-partners/:courseId
Find study partners for a specific course.

#### GET /matching/collaborators?skill=JavaScript&limit=10
Find collaborators by skill.

## Connections Endpoints

#### POST /connections/:userId
Send connection request to user.

#### PUT /connections/:connectionId/accept
Accept connection request.

#### PUT /connections/:connectionId/reject
Reject connection request.

#### GET /connections
Get user's accepted connections.

#### GET /connections/pending
Get pending connection requests.

## Study Groups Endpoints

#### POST /groups
Create a new study group.

**Request Body:**
```json
{
  "name": "CS101 Study Group",
  "description": "Weekly study sessions",
  "courseId": "uuid",
  "meetingSchedule": "Tuesdays 6PM",
  "maxMembers": 20
}
```

#### GET /groups?search=&courseId=&limit=20&offset=0
Get all study groups with optional filters.

#### GET /groups/:groupId
Get group details and members.

#### POST /groups/:groupId/join
Join a study group.

#### POST /groups/:groupId/leave
Leave a study group.

#### GET /groups/user/my-groups
Get user's study groups.

## Events Endpoints

#### POST /events
Create a new event.

**Request Body:**
```json
{
  "title": "Tech Career Fair",
  "description": "Meet with top tech companies",
  "eventDate": "2024-12-15T14:00:00Z",
  "location": "Student Center",
  "category": "Career",
  "maxAttendees": 100,
  "tags": ["career", "tech", "networking"]
}
```

#### GET /events?search=&category=&upcoming=true&limit=20&offset=0
Get all events with optional filters.

#### GET /events/:eventId
Get event details and attendees.

#### POST /events/:eventId/rsvp
RSVP to an event.

**Request Body:**
```json
{
  "status": "going"
}
```

#### GET /events/user/my-events
Get user's events.

## Messages Endpoints

#### POST /messages/conversations/direct
Create or get direct conversation.

**Request Body:**
```json
{
  "recipientId": "uuid"
}
```

#### GET /messages/conversations
Get user's conversations.

#### GET /messages/conversations/:conversationId/messages?limit=50&before=messageId
Get conversation messages.

## Notifications Endpoints

#### GET /notifications?limit=50&offset=0
Get user notifications.

#### GET /notifications/unread-count
Get unread notification count.

#### PUT /notifications/:notificationId/read
Mark notification as read.

#### PUT /notifications/mark-all-read
Mark all notifications as read.

## Admin Endpoints

All admin endpoints require admin role.

#### GET /admin/analytics
Get platform analytics.

#### GET /admin/users?search=&limit=50&offset=0
Get all users.

#### PUT /admin/users/:userId/ban
Ban a user.

#### PUT /admin/users/:userId/unban
Unban a user.

#### DELETE /admin/users/:userId
Delete a user.

#### GET /admin/groups
Get all study groups.

#### PUT /admin/groups/:groupId/deactivate
Deactivate a study group.

#### GET /admin/events
Get all events.

#### DELETE /admin/events/:eventId
Delete an event.

## WebSocket Events

Connect to WebSocket: `ws://localhost:5000`

**Authentication:**
```javascript
socket.auth = { token: 'jwt_token' };
```

**Events:**
- `join_conversation` - Join a conversation room
- `leave_conversation` - Leave a conversation room
- `send_message` - Send a message
- `new_message` - Receive new message
- `typing` - User is typing
- `stop_typing` - User stopped typing
- `user_typing` - Another user is typing
- `user_stop_typing` - Another user stopped typing
- `notification` - Receive real-time notification

## Rate Limiting

- Authentication endpoints: 5 requests per 15 minutes
- API endpoints: 100 requests per 15 minutes
- Message endpoints: 30 requests per minute

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message"
}
```

Common status codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error
