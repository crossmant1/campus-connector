# CampusConnect Database Schema

## Overview

CampusConnect uses PostgreSQL 15+ as the primary database with Redis for caching and session management.

## Tables

### users
Core user authentication and account information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique email address |
| password_hash | VARCHAR(255) | Bcrypt hashed password |
| role | VARCHAR(20) | User role (student, admin) |
| is_verified | BOOLEAN | Email verification status |
| verification_token | VARCHAR(255) | Email verification token |
| reset_token | VARCHAR(255) | Password reset token |
| reset_token_expires | TIMESTAMP | Reset token expiration |
| google_id | VARCHAR(255) | Google OAuth ID |
| created_at | TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | Last update time |
| last_login | TIMESTAMP | Last login time |

### profiles
Extended user profile information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| name | VARCHAR(255) | Full name |
| profile_picture | VARCHAR(500) | Profile picture URL |
| university | VARCHAR(255) | University name |
| department | VARCHAR(255) | Department name |
| bio | TEXT | User biography |
| linkedin_url | VARCHAR(500) | LinkedIn profile URL |
| github_url | VARCHAR(500) | GitHub profile URL |
| graduation_year | INTEGER | Expected graduation year |

### skills
Available skills in the system.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(100) | Skill name (unique) |
| category | VARCHAR(50) | Skill category |

### user_skills
Junction table for user skills with proficiency levels.

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | Foreign key to users |
| skill_id | UUID | Foreign key to skills |
| proficiency_level | VARCHAR(20) | beginner, intermediate, advanced, expert |

### courses
Available courses in the system.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| code | VARCHAR(50) | Course code |
| name | VARCHAR(255) | Course name |
| department | VARCHAR(255) | Department |
| university | VARCHAR(255) | University |

### user_courses
Junction table for user enrolled courses.

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | Foreign key to users |
| course_id | UUID | Foreign key to courses |
| semester | VARCHAR(50) | Semester enrolled |
| year | INTEGER | Year enrolled |

### interests
Available interests in the system.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(100) | Interest name (unique) |

### user_interests
Junction table for user interests.

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | Foreign key to users |
| interest_id | UUID | Foreign key to interests |

### connections
Student connections and connection requests.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User sending request |
| connected_user_id | UUID | User receiving request |
| status | VARCHAR(20) | pending, accepted, rejected |
| match_score | DECIMAL(5,2) | Calculated match score |

### study_groups
Study groups created by students.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Group name |
| course_id | UUID | Associated course |
| description | TEXT | Group description |
| meeting_schedule | VARCHAR(255) | Meeting schedule |
| admin_id | UUID | Group admin user |
| max_members | INTEGER | Maximum members (default 50) |
| is_active | BOOLEAN | Active status |

### group_members
Junction table for study group members.

| Column | Type | Description |
|--------|------|-------------|
| group_id | UUID | Foreign key to study_groups |
| user_id | UUID | Foreign key to users |
| role | VARCHAR(20) | admin, member |
| joined_at | TIMESTAMP | Join timestamp |

### events
Campus events.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | VARCHAR(255) | Event title |
| description | TEXT | Event description |
| event_date | TIMESTAMP | Event date and time |
| location | VARCHAR(255) | Event location |
| organizer_id | UUID | Event organizer |
| category | VARCHAR(50) | Event category |
| max_attendees | INTEGER | Maximum attendees |
| is_active | BOOLEAN | Active status |

### event_tags
Tags for events.

| Column | Type | Description |
|--------|------|-------------|
| event_id | UUID | Foreign key to events |
| tag | VARCHAR(50) | Tag name |

### event_rsvps
Event RSVPs.

| Column | Type | Description |
|--------|------|-------------|
| event_id | UUID | Foreign key to events |
| user_id | UUID | Foreign key to users |
| status | VARCHAR(20) | going, interested, not_going |

### conversations
Chat conversations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| type | VARCHAR(20) | direct, group |
| group_id | UUID | Associated group (if group chat) |

### conversation_participants
Conversation participants.

| Column | Type | Description |
|--------|------|-------------|
| conversation_id | UUID | Foreign key to conversations |
| user_id | UUID | Foreign key to users |
| joined_at | TIMESTAMP | Join timestamp |
| last_read_at | TIMESTAMP | Last read timestamp |

### messages
Chat messages.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | Foreign key to conversations |
| sender_id | UUID | Message sender |
| content | TEXT | Message content |
| file_url | VARCHAR(500) | Attached file URL |
| is_read | BOOLEAN | Read status |

### notifications
User notifications.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| type | VARCHAR(50) | Notification type |
| title | VARCHAR(255) | Notification title |
| message | TEXT | Notification message |
| link | VARCHAR(500) | Related link |
| is_read | BOOLEAN | Read status |

## Indexes

Performance indexes are created on:
- users.email
- users.google_id
- profiles.user_id
- user_skills.user_id
- user_courses.user_id
- connections.user_id, connections.status
- group_members.user_id, group_members.group_id
- events.event_date
- event_rsvps.user_id
- messages.conversation_id, messages.created_at
- notifications.user_id, notifications.is_read

## Matching Algorithm

The intelligent matching system calculates match scores based on:

```
match_score = 0.4 * shared_courses + 0.3 * shared_skills + 0.2 * shared_interests + 0.1 * department_match
```

Where each component is normalized to a 0-1 scale, and the final score is multiplied by 100 for percentage.

## Triggers

Automatic `updated_at` triggers are set on:
- users
- profiles
- connections
- study_groups
- events
- conversations
- messages

## Relationships

```
users (1) -> (1) profiles
users (1) -> (N) user_skills -> (N) skills
users (1) -> (N) user_courses -> (N) courses
users (1) -> (N) user_interests -> (N) interests
users (1) -> (N) connections
users (1) -> (N) group_members -> (N) study_groups
users (1) -> (N) event_rsvps -> (N) events
users (1) -> (N) conversation_participants -> (N) conversations
users (1) -> (N) messages
users (1) -> (N) notifications
```

## Backup and Maintenance

Recommended maintenance tasks:
- Daily backups of PostgreSQL database
- Weekly VACUUM ANALYZE for performance
- Monitor index usage and query performance
- Archive old messages and notifications quarterly
- Regular security audits of user data
