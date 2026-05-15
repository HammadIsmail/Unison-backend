# 📚 UNISON Exhaustive API Handbook (v1.0)

## 🔐 Authentication
Handle user entry, verification, and security.

### 1. Send OTP
`POST /api/auth/send-otp`  
**Summary**: Sends a 6-digit code for verification or password reset.

**Request Body**:
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `email` | String | **Required** | User's university email |
| `type` | Enum | **Required** | `email_verification` or `forgot_password` |

**Response (201)**:
```json
{
  "message": "OTP sent to your email.",
  "otp_expires_in": "10 minutes"
}
```

> [!IMPORTANT]
> **Rate Limiting**: Users can only request one OTP every 1 minute per email and type. Subsequent requests within this window will return a `429 Too Many Requests` error.


---

### 2. Verify OTP
`POST /api/auth/verify-otp`  
**Summary**: Validates the OTP and returns a session token.

**Request Body**:
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `email` | String | **Required** | Must match the email OTP was sent to |
| `otp` | String | **Required** | 6-digit code received via email |
| `type` | Enum | **Required** | Same type used in 'Send OTP' |

**Response (201)**:
```json
{
  "message": "OTP verified successfully.",
  "verified_token": "eyJhbGciOiJIUzI1Ni..."
}
```

---

### 3. Register
`POST /api/auth/register`  
**Summary**: Finalize account creation.

**Request**: `multipart/form-data`
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `verified_token` | String | **Required** | Token received from Verify OTP endpoint |
| `username` | String | **Required** | Unique identifier (e.g., `ahmed_h`) |
| `display_name` | String | **Required** | Preferred name |
| `email` | String | **Required** | Must match verified email |
| `password` | String | **Required** | Min 8 characters |
| `role` | Enum | **Required** | `alumni`, `student`, or `partner` |
| `roll_number` | String | *Optional* | University ID (Required for students/alumni) |
| `degree` | String | *Optional* | e.g. `BS Computer Science` (Required for students/alumni) |
| `student_card` | File | **Required** | ID image file (Student Card or Business Card) |
| `affiliation` | String | *Optional* | **Partner Only** (e.g. `Google`) |
| `job_title` | String | *Optional* | **Partner Only** (e.g. `HR Manager`) |
| `graduation_year`| Number | *Optional* | **Alumni Only** (Required for graduates) |
| `semester` | Number | *Optional* | **Student Only** (Required for students) |
| `batch` | String | **Required** | Batch year (e.g., `2021`) |

**Response (201)**:
```json
{ "message": "Account created successfully. Pending admin approval." }
```

---

### 4. Login
`POST /api/auth/login`  
**Summary**: Authenticate to receive an access token.

**Request Body**:
| Field | Type | Status | Required |
| :--- | :--- | :--- | :--- |
| `email` | String | **Required** | Registered email |
| `password` | String | **Required** | User's password |

**Response (201)**:
```json
{
  "token": "JWT_ACCESS_TOKEN",
  "role": "alumni",
  "account_status": "approved",
  "profile": {
    "id": "uuid-user-123",
    "username": "ahmed_h",
    "display_name": "Ahmed The Dev",
    "email": "ahmed@uet.edu.pk",
    "role": "alumni",
    "degree": "BS Computer Science",
    "roll_number": "2021-CS-101",
    "batch": "2021-2025",
    "graduation_year": 2025,
    "phone": "+923001234567",
    "profile_picture": "https://cloudinary.com/ahmed_profile.jpg"
  }
}
```

---

### 5. Reset Password
`POST /api/auth/reset-password`  
**Summary**: Change password using the `verified_token`.

**Request Body**:
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `verified_token` | String | **Required** | Token received from Verify OTP endpoint |
| `new_password` | String | **Required** | Min 8 characters |

**Response (200)**:
```json
{ "message": "Password reset successfully." }
```

---

## 👨‍💼 Admin
Restricted to users with the `admin` role. Requires `Bearer JWT`.

### 1. Get Pending Accounts
`GET /api/admin/pending-accounts`  
**Summary**: Retrieves all users whose registration is still awaiting approval.

**Response (200)**:
```json
[
  {
    "id": "uuid-user-123",
    "username": "zain_a",
    "display_name": "Zainab Ahmed",
    "email": "zainab@uet.edu.pk",
    "role": "student",
    "registered_at": "2024-03-23T10:00:00Z",
    "profile_picture": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    "student_card_url": "https://cloudinary.com/student_card.jpg",
    "affiliation": "Google",
    "job_title": "HR Manager"
  }
]
```

---

### 2. Approve Account
`PATCH /api/admin/approve-account/:id`  
**Summary**: Changes account status to 'approved' and notifies the user.

**Response (200)**:
```json
{ "message": "Account approved. Email sent to user." }
```

---

### 3. Reject Account
`PATCH /api/admin/reject-account/:id`  
**Summary**: Rejects the account request with a reason and notifies the user.

**Request Body**:
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `reason` | String | **Required** | Reason for rejection to be sent to user |

**Response (200)**:
```json
{ "message": "Account rejected. Email sent to user." }
```

---

### 4. Bulk Approve Accounts
`PATCH /api/admin/bulk/approve`  
**Summary**: Approves multiple pending accounts in a single request.

**Request Body**:
```json
{ "ids": ["uuid-1", "uuid-2", "uuid-3"] }
```

**Response (200)**:
```json
{ 
  "message": "Bulk approval complete. 3 succeeded, 0 failed.",
  "succeeded": 3,
  "failed": 0
}
```

---

### 5. Bulk Reject Accounts
`PATCH /api/admin/bulk/reject`  
**Summary**: Rejects multiple pending accounts with a single reason.

**Request Body**:
```json
{ 
  "ids": ["uuid-1", "uuid-2"],
  "reason": "Incomplete documentation."
}
```

**Response (200)**:
```json
{ 
  "message": "Bulk rejection complete. 2 succeeded, 0 failed.",
  "succeeded": 2,
  "failed": 0
}
```

---

### 6. Dashboard Statistics
`GET /api/admin/dashboard-stats`  
**Summary**: Fetch high-level metrics for the administration dashboard.

**Response (200)**:
```json
{
  "total_alumni": 120,
  "total_students": 450,
  "pending_accounts": 15,
  "total_opportunities": 35,
  "total_companies": 45,
  "most_common_skills": ["Node.js", "React", "Python"]
}
```

---

### 5. All Alumni (Paginated)
`GET /api/admin/all-alumni`  
**Summary**: Lists all approved alumni with search and pagination support.

**Query Parameters**:
| Parameter | Type | Status | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | Number | *Optional* | `1` | Page number |
| `limit` | Number | *Optional* | `10` | Items per page |
| `search` | String | *Optional* | `""` | Search by display name |

**Response (200)**:
```json
{
  "total": 120,
  "page": 1,
  "data": [
    {
      "id": "uuid-alumni-123",
      "username": "hammad_i",
      "display_name": "Hammad Ismail",
      "email": "hammad@example.com",
      "phone": "+923001234567",
      "bio": "Software engineer with 5 years of experience.",
      "company": "Google",
      "role": "Software Engineer",
      "graduation_year": 2020,
      "degree": "BS Computer Science",
      "batch": "2016-2020",
      "linkedin_url": "https://linkedin.com/in/hammad",
      "profile_picture": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      "created_at": "2024-03-23T10:00:00Z"
    }
  ]
}
```

---

### 6. All Students (Paginated)
`GET /api/admin/all-students`  
**Summary**: Lists all approved students with search and pagination support.

**Response (200)**:
```json
{
  "total": 450,
  "page": 1,
  "data": [
    {
      "id": "uuid-student-123",
      "username": "ali_k",
      "display_name": "Ali Khan",
      "email": "ali@example.com",
      "phone": "+923451234567",
      "bio": "Passionate about web development.",
      "roll_number": "2021-CS-110",
      "semester": 6,
      "degree": "BS Computer Science",
      "batch": "2021-2025",
      "profile_picture": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      "created_at": "2024-03-23T10:00:00Z"
    }
  ]
}
```

---

### 6b. All Partners (Paginated)
`GET /api/admin/all-partners`  
**Summary**: Lists all approved industry partners with search and pagination support.

**Response (200)**:
```json
{
  "total": 45,
  "page": 1,
  "data": [
    {
      "id": "uuid-partner-123",
      "username": "sarah_j",
      "display_name": "Sarah Jenkins",
      "email": "sarah@google.com",
      "phone": "+923009876543",
      "bio": "Recruiting the next generation of talent.",
      "affiliation": "Google",
      "job_title": "HR Lead",
      "linkedin_url": "https://linkedin.com/in/sarahj",
      "profile_picture": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      "created_at": "2024-03-23T10:00:00Z"
    }
  ]
}
```

---

### 7. Remove Account (Soft Delete)
`DELETE /api/admin/remove-account/:id`  
**Summary**: Soft-deletes a user account. All historical data (chats, activities, analytics) is preserved. The user cannot log in and is invisible across all active platform APIs.

**Query Parameters** (optional):
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `reason` | String | Audit trail reason (e.g. `Violation of community guidelines`) |

**Deletion metadata stored**:
- `deleted_by` — admin UUID
- `deletion_reason` — reason string
- `deletion_source` — `"admin"`
- `deleted_at` — timestamp

**Response (200)**:
```json
{ "message": "Account has been soft-deleted. Historical data is preserved." }
```

> [!NOTE]
> If MongoDB update fails after Neo4j update, an automatic compensation rollback reverts Neo4j to maintain distributed consistency.

---

### 7b. Restore Account
`PATCH /api/admin/restore-account/:id`  
**Summary**: Restores a previously soft-deleted account. Re-enables login and makes the user visible on all active platform APIs. Cascades to restore their posted opportunities.

**Response (200)**:
```json
{
  "message": "Account restored successfully. The user can now log in.",
  "userId": "uuid-123",
  "restored_at": "2025-05-12T10:00:00Z"
}
```

> [!NOTE]
> Full compensation logic: if MongoDB restore fails, Neo4j is automatically re-soft-deleted to keep both databases consistent.

---

### 8. Request Email Change
`PATCH /api/admin/request-email-change`  
**Summary**: Initiates an email change by sending a 6-digit OTP to the new email address.

**Request Body**:
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `new_email` | String | **Required** | The new email address for the admin account |

**Response (200)**:
```json
{ "message": "OTP sent to your new email address." }
```

---

### 9. Verify Email Change
`PATCH /api/admin/verify-email-change`  
**Summary**: Verifies the OTP sent to the new email and updates the admin's email address.

**Request Body**:
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `new_email` | String | **Required** | Must match the email OTP was sent to |
| `otp` | String | **Required** | 6-digit code received via email |

**Response (200)**:
```json
{ 
  "message": "Admin email updated successfully.",
  "new_email": "new-email@admin.unison.pk"
}
```

---

### 12. Get Recent Activity
`GET /api/admin/recent-activity`  
**Summary**: Retrieves filtered platform activities.

**Query Parameters**:
| Parameter | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `limit` | Number | Optional | Default: 10 |
| `type` | String | Optional | Filter by event type (e.g., `ACCOUNT_APPROVED`) |
| `userId`| String | Optional | Filter by a specific user ID |

**Response (200)**:
```json
[
  {
    "id": "uuid-activity-1",
    "type": "USER_REGISTERED",
    "description": "New alumni registered: Sarah Chen",
    "created_at": "2024-03-23T10:00:00Z",
    "related_id": "uuid-sarah"
  }
]
```

---

### 13. Get Upgrade Requests
`GET /api/admin/upgrade-requests`  
**Summary**: Lists all students waiting to be upgraded to alumni.

**Response (200)**:
```json
[
  {
    "id": "uuid-user-123",
    "username": "zain_a",
    "display_name": "Zainab Ahmed",
    "email": "zainab@uet.edu.pk",
    "roll_number": "2021-CS-110",
    "graduation_year": 2024,
    "upgrade_status": "pending",
    "profile_picture": "https://cloudinary.com/profile.jpg"
  }
]
```

---

### 12. Approve Upgrade
`PATCH /api/admin/approve-upgrade/:id`  
**Summary**: Approves a student to alumni profile upgrade request and notifies the user.

**Response (200)**:
```json
{ "message": "Profile upgraded successfully. Email sent to user." }
```

---

### 13. Reject Upgrade
`PATCH /api/admin/reject-upgrade/:id`  
**Summary**: Rejects a student to alumni profile upgrade request with a reason and notifies the user.

**Request Body**:
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `rejection_reason` | String | **Required** | Reason for rejection to be sent to user |

**Response (200)**:
```json
{ "message": "Upgrade request rejected. Email sent to user." }
```

---

### 16. Get Advanced Analytics
`GET /api/admin/advanced-analytics`  
**Summary**: Retrieves professional-grade analytics with optional date filtering.

**Query Parameters**:
| Parameter | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `from` | Date | Optional | Start date (YYYY-MM-DD) |
| `to` | Date | Optional | End date (YYYY-MM-DD) |

**Response (200)**:
```json
{
  "skill_gap": [...],
  "growth_trends": [...],
  "engagement_metrics": [...]
}
```

---

### 17. Moderation: List All Opportunities
`GET /api/admin/opportunities`  
**Summary**: Lists all opportunities in the system for administrative review.

**Query Parameters**: `page`, `limit`, `search`

**Response (200)**: Paginated list including poster details.

---

### 18. Moderation: Admin Delete Opportunity
`DELETE /api/admin/opportunities/:id`  
**Summary**: Allows an admin to remove any opportunity from the platform.

**Response (200)**: `{ "message": "Opportunity removed by administrator." }`

---

### 19. Export Data (CSV)
`GET /api/admin/export/:role`  
**Summary**: Downloads a CSV file containing all approved users of a specific role.  
**Roles**: `alumni` or `student`.

**Response (200)**: Binary file stream (CSV).

---

### 20. Broadcast Announcement
`POST /api/admin/announcements`  
**Summary**: Creates a platform-wide event announcement and broadcasts it as a real-time notification to **every approved user** in the network. Supports optional image or video attachment.

**Request**: `multipart/form-data`
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `title` | String | **Required** | Short event title (e.g., `Annual Convocation 2025`) |
| `description` | String | **Required** | Full announcement body |
| `event_date` | String | *Optional* | ISO date-time of the event (e.g., `2025-06-15T10:00:00Z`) |
| `media` | File | *Optional* | Image (jpg/png/webp) or Video file to attach to the announcement |

**Response (201)**:
```json
{
  "message": "Announcement broadcasted to 542 users.",
  "id": "663f1a2b3c4d5e6f78901234",
  "title": "Annual Convocation 2025",
  "media_url": "https://res.cloudinary.com/demo/image/upload/v123/banner.jpg"
}
```

> [!NOTE]
> The announcement is persisted in MongoDB and each user receives a notification of type `announcement` — both stored in DB and pushed via Socket.io for real-time delivery to online users.

---

### 21. List Announcements
`GET /api/admin/announcements`  
**Summary**: Paginated list of all past announcements.

**Query Parameters**:
| Parameter | Type | Status | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | Number | *Optional* | `1` | Page number |
| `limit` | Number | *Optional* | `10` | Items per page |

**Response (200)**:
```json
{
  "total": 12,
  "page": 1,
  "data": [
    {
      "id": "663f1a2b3c4d5e6f78901234",
      "title": "Annual Convocation 2025",
      "description": "Join us for the Annual Convocation ceremony at UET Faisalabad.",
      "event_date": "2025-06-15T10:00:00Z",
      "media_url": "https://res.cloudinary.com/demo/image/upload/v123/banner.jpg",
      "media_type": "image",
      "created_by_admin": "admin-uuid-123",
      "created_at": "2025-05-12T10:00:00Z"
    }
  ]
}
```

---

### 22. Delete Announcement
`DELETE /api/admin/announcements/:id`  
**Summary**: Removes an announcement record by its MongoDB ID.

**Response (200)**:
```json
{ "message": "Announcement deleted successfully." }
```

---

### 23. Moderation: List All Events
`GET /api/admin/events`  
**Summary**: Lists all events in the system for administrative oversight.
**Query Parameters**: `page`, `limit`, `search`

**Response (200)**:
```json
{
  "total": 5,
  "page": 1,
  "data": [
    {
      "id": "uuid-event-123",
      "title": "Alumni Meetup",
      "date": "2024-12-01T18:00:00Z",
      "hosted_by": "Hammad Ismail",
      "host_username": "hammad_i"
    }
  ]
}
```

---

### 24. Moderation: Admin Delete Event
`DELETE /api/admin/events/:id`  
**Summary**: Allows an admin to remove any event from the platform.

**Response (200)**:
```json
{ "message": "Event removed by administrator." }
```

---

## 👤 Alumni
Requires `Bearer JWT`. Role restriction: `alumni`.

### 1. Get My Profile
`GET /api/alumni/me`  
**Summary**: Retrieves the full profile of the logged-in alumni.

**Response (200)**:
```json
{
  "username": "ahmed_h",
  "display_name": "Ahmed The Dev",
  "email": "ahmed@uet.edu.pk",
  "bio": "Senior software engineer.",
  "graduation_year": 2025,
  "degree": "BS Computer Science",
  "current_company": "Google",
  "role": "Senior Engineer",
  "skills": ["TypeScript", "NestJS"],
  "batch": "2021-2025",
  "connections_count": 45,
  "linkedin_url": "https://linkedin.com/in/ahmed",
  "phone": "+923001234567",
  "profile_picture": "https://cloudinary.com/ahmed_profile.jpg",
  "backDropImage": "https://cloudinary.com/ahmed_backdrop.jpg",
  "work_experiences": [...],
  "detailed_skills": [...],
  "education": [...]
}
```

---

### 2. Update My Profile
`PUT /api/alumni/me`  
**Summary**: Updates personal profile information.

**Request**: `multipart/form-data`
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `display_name` | String | *Optional* | Name displayed on profile |
| `bio` | String | *Optional* | Professional summary |
| `linkedin_url` | String | *Optional*| LinkedIn profile link |
| `phone` | String | *Optional* | Contact phone number |
| `profile_picture`| File | *Optional* | Profile picture image file (binary) |
| `backDropImage`| File | *Optional* | Backdrop cover image file (binary) |

**Response (200)**:
```json
{ "message": "Profile updated successfully." }
```

---

### 3. Add Work Experience
`POST /api/alumni/work-experience`  
**Summary**: Records a new job or role in the profile.

**Request Body**:
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `company_name` | String | **Required** | Name of the employer |
| `role` | String | **Required** | Your job title |
| `start_date` | Date | **Required** | Start date (YYYY-MM-DD) |
| `end_date` | Date | *Optional* | End date (if applicable) |
| `is_current` | Boolean| **Required** | Set `true` if this is your current job |
| `employment_type`| Enum | **Required** | `full-time`, `part-time`, `freelance` |

**Response (201)**:
```json
{ "message": "Work experience added successfully." }
```

---

### 4. Update Work Experience
`PUT /api/alumni/work-experience/:id`  
**Summary**: Modifies an existing work experience record.

**Request Body**:
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `role` | String | *Optional* | Updated job title |
| `end_date` | Date | *Optional* | ISO date |
| `is_current` | Boolean| *Optional* | Update job status |

**Response (200)**:
```json
{ "message": "Work experience updated successfully." }
```

---

### 5. Delete Work Experience
`DELETE /api/alumni/work-experience/:id`

**Response (200)**:
```json
{ "message": "Work experience deleted successfully." }
```

---

### 6. Add Skill
`POST /api/alumni/skills`  
**Summary**: Adds a technical or soft skill with proficiency level.

**Request Body**:
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `skill_name` | String | **Required** | e.g., `TypeScript` |
| `category` | String | **Required** | e.g., `Programming` |
| `proficiency_level`| Enum | **Required** | `beginner`, `intermediate`, `expert` |
| `years_experience`| Number | *Optional* | Years of experience |

**Response (201)**:
```json
{ "message": "Skill added successfully." }
```

---

### 7. Add Education
`POST /api/alumni/education`  
**Summary**: Records a new degree or academic achievement.

**Request Body**:
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `university` | String | **Required** | Name of the institution |
| `degree` | String | **Required** | e.g., `Masters in AI` |
| `field_of_study`| String | *Optional* | e.g., `Computer Science` |
| `start_date` | Date | **Required** | ISO date (YYYY-MM-DD) |
| `end_date` | Date | *Optional* | ISO date |
| `is_current` | Boolean| **Required** | Set `true` if currently studying |

**Response (201)**:
```json
{ "message": "Education added successfully." }
```

---

### 8. Update Education
`PUT /api/alumni/education/:id`  
**Summary**: Modifies an existing education record.

**Request Body**:
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `degree` | String | *Optional* | Updated degree name |
| `end_date` | Date | *Optional* | ISO date |
| `is_current` | Boolean| *Optional* | Update enrollment status |

**Response (200)**:
```json
{ "message": "Education updated successfully." }
```

---

### 9. Delete Education
`DELETE /api/alumni/education/:id`

**Response (200)**:
```json
{ "message": "Education removed successfully." }
```

---

---

### 10. Get My Connections
`GET /api/alumni/connections`  
**Summary**: Retrieves a list of all accepted professional connections.

**Response (200)**:
```json
[
  {
    "id": "uuid-123",
    "display_name": "Ali Khan",
    "username": "alikhan",
    "profile_picture": "https://cloudinary.com/profile.jpg",
    "bio": "Product manager with a passion for tech.",
    "backDropImage": "https://cloudinary.com/ali_backdrop.jpg",
    "company": "Microsoft",
    "role": "Product Manager"
  }
]
```

---

### 11. Find Batch Mates
`GET /api/alumni/batch-mates`  
**Summary**: Discovery based on graduation year.

**Response (200)**:
```json
[
  {
    "id": "uuid-123",
    "display_name": "Ali Khan",
    "username": "alikhan",
    "profile_picture": "https://cloudinary.com/profile.jpg",
    "bio": "Product manager with a passion for tech.",
    "backDropImage": "https://cloudinary.com/ali_backdrop.jpg",
    "company": "Microsoft",
    "role": "Product Manager"
  },
  {
    "id": "uuid-456",
    "display_name": "Zainab Ahmed",
    "username": "zainab",
    "profile_picture": null,
    "bio": "Graduate of 2024.",
    "backDropImage": null,
    "company": null,
    "role": null
  }
]
```

> **Fields**: `id`, `display_name`, `username` (always present), `profile_picture` (optional), `company` / `role` (optional).

---

### 12. Delete Account
`DELETE /api/alumni/me`  
**Summary**: Permanently deletes your alumni account and all associated data (profile, work history, posted opportunities, notifications, and media).

**Response (200)**:
```json
{ "message": "Your account and all associated data have been permanently deleted." }
```

---

---

---

## 🔗 Connections
Shared relationship management for all users. Requires `Bearer JWT`.

### 1. Send Connection Request
`POST /api/connections/request/:target_id`  
**Summary**: Sends a connection request to another user.

**Constraints**: None. Any user can send a connection request to any other user.

**Request Body**: None

**Response (201)**:
```json
{ "message": "Connection request sent successfully." }
```

---

### 2. Get Pending Requests
`GET /api/connections/requests`  
**Summary**: Lists all incoming pending connection requests for the current user.

**Response (200)**:
```json
[
  {
    "sender_id": "uuid-sender-123",
    "sender_display_name": "Zainab Ahmed",
    "sender_username": "zainab",
    "sender_profile_picture": "https://cloudinary.com/profile.jpg",
    "requested_at": "2024-03-23T10:00:00Z"
  }
]
```

---

### 3. Get Sent Pending Requests
`GET /api/connections/requests/sent`  
**Summary**: Lists all pending connection requests that the current user has sent.

**Response (200)**:
```json
[
  {
    "target_id": "uuid-target-123",
    "target_display_name": "Ali Khan",
    "target_username": "ali_k",
    "target_profile_picture": "https://cloudinary.com/ali.jpg",
    "requested_at": "2024-03-23T11:00:00Z"
  }
]
```

---

### 4. Cancel Sent Connection Request
`DELETE /api/connections/request/:target_id`  
**Summary**: Cancel a pending connection request you have sent.

**Response (200)**:
```json
{ "message": "Connection request cancelled successfully." }
```

---

### 5. Respond to Request
`PATCH /api/connections/requests/:sender_id/respond`  
**Summary**: Accept or reject an incoming request.

**Request Body**:
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `action` | Enum | **Required** | `accept` or `reject` |

**Response (200)**:
```json
{ "message": "Connection request accepted." }
```

---

### 6. Get Connection Status
`GET /api/connections/status/:target_id`  
**Summary**: Checks the current connection status with another user.

**Response (200)**:
```json
{
  "status": "pending",
  "is_sender": true
}
```

---

### 7. Remove Connection
`DELETE /api/connections/:target_id`  
**Summary**: Immediately deletes an active connection or cancels a pending request.

**Response (200)**:
```json
{ "message": "Connection removed successfully." }
```

---

### 8. Block User
`POST /api/connections/block/:target_id`  
**Summary**: Immediately blocks another user. Severs any existing connections and prevents future communication/visibility.

**Response (201)**:
```json
{ "message": "User blocked successfully." }
```

---

### 9. Unblock User
`DELETE /api/connections/unblock/:target_id`  
**Summary**: Removes a block record. Does **not** restore the previous connection status.

**Response (200)**:
```json
{ "message": "User unblocked successfully." }
```

---

### 10. Follow User
`POST /api/connections/follow/:target_id`  
**Summary**: Follow another user to receive updates.

**Response (201)**:
```json
{ "message": "Successfully followed user." }
```

---

### 11. Unfollow User
`DELETE /api/connections/unfollow/:target_id`  
**Summary**: Unfollow a user you are currently following.

**Response (200)**:
```json
{ "message": "Successfully unfollowed user." }
```

---

### 12. Get Followers
`GET /api/connections/:target_id/followers`  
**Summary**: Retrieve a list of users who are following the specified target user.

**Response (200)**:
```json
[
  {
    "id": "uuid-user-123",
    "display_name": "Hammad Ismail",
    "username": "hammad_i",
    "profile_picture": "https://cloudinary.com/pic.jpg",
    "role": "alumni",
    "bio": "Software Engineer"
  }
]
```

---

### 13. Get Following
`GET /api/connections/:target_id/following`  
**Summary**: Retrieve a list of users that the specified target user is following.

**Response (200)**:
```json
[
  {
    "id": "uuid-user-456",
    "display_name": "Sarah Chen",
    "username": "sarah_c",
    "profile_picture": "https://cloudinary.com/sarah.jpg",
    "role": "student",
    "bio": "Computer Science Junior"
  }
]
```

---

## 🎭 Profiles
Comprehensive views for discovery and professional networking. Requires `Bearer JWT`.

### 1. Get Public Profile
`GET /api/profiles/user/:id`  
**Summary**: Retrieves a full, high-detail view of any user (student or alumni).

**Includes**:
- **Personal**: Bio, Picture, Degree, Batch.
- **Academic**: Roll Number, Semester (Students).
- **Professional**: Full Work History (Alumni).
- **Contributions**: Opportunities posted by the user.
- **Social**: Current connection status with the user.

**Response (200)**:
```json
{
  "id": "uuid-123",
  "username": "hammad_i",
  "display_name": "Hammad Ismail",
  "role": "alumni",
  "profile_picture": "...",
  "backDropImage": "...",
  "bio": "Software Engineer",
  "degree": "BSCS",
  "batch": "2016-2020",
  "graduation_year": 2020,
  "work_experience": [
    {
      "id": "uuid-exp-123",
      "company_name": "Google",
      "role": "Senior Software Engineer",
      "start_date": "2023-01-01",
      "end_date": null,
      "is_current": true,
      "employment_type": "full-time"
    }
  ],
  "skills": [
    {
      "id": "uuid-skill-123",
      "name": "TypeScript",
      "category": "Programming",
      "proficiency": "expert"
    }
  ],
  "opportunities_posted": [
    {
      "id": "uuid-opp-123",
      "title": "Backend Developer",
      "type": "job",
      "company": "Startup X",
      "posted_at": "2024-03-23",
      "deadline": "2024-04-01"
    }
  ],
  "connection_status": "pending",
  "is_connection_sender": true,
  "followers_count": 120,
  "following_count": 45,
  "is_following": true,
  "is_online": true,
  "last_seen": "2024-03-23T10:00:00Z"
}
```

---

### 2. Get User Suggestions
`GET /api/profiles/suggestions`  
**Summary**: Retrieves a list of 5 recommended users based on shared attributes like skills, degree, batch, department, or company.

**Response (200)**:
```json
[
  {
    "id": "uuid-123",
    "display_name": "Sarah Chen",
    "username": "sarah_c",
    "profile_picture": "https://cloudinary.com/sarah.jpg",
    "role": "alumni",
    "degree": "BSCS",
    "batch": "2016-2020",
    "mutual_connections": 3
  }
]
```

---

## 🎓 Student
Requires `Bearer JWT`. Role restriction: `student`.

### 1. Get My Profile
`GET /api/student/me`  
**Summary**: Retrieves the full profile of the logged-in student.

**Response (200)**:
```json
{
  "display_name": "Ali Khan",
  "email": "ali@uet.edu.pk",
  "roll_number": "2021-CS-110",
  "semester": 6,
  "degree": "BS Computer Science",
  "batch": "2021-2025",
  "bio": "Aspiring data scientist.",
  "phone": "+923451234567",
  "profile_picture": "https://cloudinary.com/ali_pro.jpg",
  "backDropImage": "https://cloudinary.com/ali_backdrop.jpg"
}
```

---

### 2. Update My Profile
`PUT /api/student/me`  
**Summary**: Updates personal profile information.

**Request**: `multipart/form-data`
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `display_name` | String | *Optional* | Preferred name |
| `phone` | String | *Optional* | Contact phone number |
| `bio` | String | *Optional* | Short personal bio |
| `profile_picture`| File | *Optional* | Profile picture image file (binary) |
| `backDropImage`| File | *Optional* | Backdrop cover image file (binary) |
| `semester` | Number | *Optional* | Update current semester (1-8) |

---

### 3. Add Skill
`POST /api/student/skills`  
**Summary**: Adds a technical or soft skill to the student profile.

**Request Body**:
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `skill_name` | String | **Required** | e.g., `Python` |
| `category` | String | **Required** | e.g., `Data Science` |
| `proficiency_level`| Enum | **Required** | `beginner`, `intermediate`, `expert` |

---

### 4. Get My Connections
`GET /api/student/connections`  
**Summary**: Retrieves a list of all accepted professional connections.

**Response (200)**:
```json
[
  {
    "id": "uuid-alumni-123",
    "display_name": "Ahmed Hassan",
    "username": "ahmed_h",
    "profile_picture": "https://cloudinary.com/ahmed.jpg",
    "bio": "Senior software engineer at Google.",
    "backDropImage": "https://cloudinary.com/ahmed_backdrop.jpg",
    "company": "Google",
    "role": "Software Engineer"
  }
]
```

---

### 5. Delete Account
`DELETE /api/student/me`  
**Summary**: Permanently deletes your student account and all associated data (profile, notifications, and media).

**Response (200)**:
```json
{ "message": "Your account and all associated data have been permanently deleted." }
```

---

### 6. Request Profile Upgrade
`POST /api/student/upgrade-request`  
**Summary**: Requests the admin to upgrade your profile from Student to Alumni.

**Request Body**:
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `graduation_year` | Number | **Required** | The year you graduate or have graduated |

**Response (200)**:
```json
{ "message": "Profile upgrade request submitted successfully." }
```

---

## 💼 Opportunities
Broadcast and discover career prospects. Requires `Bearer JWT`.

### 1. Post a New Opportunity
`POST /api/opportunities`  
**Summary**: Restricted to `alumni` and `admin`. Allows posting job or internship opportunities with optional batch media (images/videos).

**Request**: `multipart/form-data`
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `title` | String | **Required** | Title of the role |
| `type` | Enum | **Required** | `job`, `internship`, `freelance` |
| `description`| String | **Required** | Job details |
| `requirements`| String | **Required** | Skills needed |
| `location` | String | **Required** | e.g. `Lahore`, `Remote` |
| `is_remote` | Boolean | **Required** | Work from home? |
| `deadline` | Date | **Required** | Applications close date |
| `company_name`| String | **Required** | Name of the company |
| `apply_link` | URL | **Required** | Direct application URL |
| `required_skills`| String[]| **Required** | Required skills list |
| `media` | File[] | *Optional* | Up to 5 images or videos |

**Notes**:
- **Media Limit**: Maximum 5 files (images/videos). Exceeding this returns a `400 Bad Request` with message: `"media cannot exceed more than 5"`.
- **Data Transformation**: Fields like `is_remote` (boolean) and `required_skills` (array) are automatically transformed from their form-data string representations to the correct types before validation.

**Response (201)**:
```json
{
  "message": "Opportunity broadcasted to network successfully.",
  "opportunity_id": "uuid-opp-123"
}
```

---

### 2. List All (Filtered)
`GET /api/opportunities`  
**Query Parameters**: `page`, `limit`, `type`, `skill`, `is_remote`

**Response (200)**:
```json
{
  "total": 100,
  "page": 1,
  "data": [
    {
      "id": "uuid-opp-123",
      "title": "Software Engineer",
      "type": "full-time",
      "description": "Deep dive into NestJS and Neo4j.",
      "company": "Google",
      "location": "Mountain View, CA",
      "is_remote": true,
      "apply_link": "https://google.com/careers",
      "posted_by": {
        "id": "uuid-user-123",
        "display_name": "Hammad Ismail",
        "username": "hammad_i",
        "profile_picture": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        "role": "alumni"
      },
      "posted_at": "2024-03-23",
      "deadline": "2024-04-01",
      "media": ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
    }
  ]
}
```


---

### 3. Get Details
`GET /api/opportunities/:id`

**Response (200)**:
```json
{
  "id": "uuid-opp-123",
  "title": "Software Engineer",
  "type": "full-time",
  "description": "Deep dive into NestJS and Neo4j.",
  "requirements": "3+ years of experience in Node.js.",
  "location": "Mountain View, CA",
  "is_remote": true,
  "apply_link": "https://google.com/careers",
  "deadline": "2024-04-01",
  "company": {
    "name": "Google"
  },
  "required_skills": ["Node.js", "NestJS"],
  "posted_by": {
    "id": "uuid-user-123",
    "display_name": "Hammad Ismail",
    "username": "hammad_i",
    "profile_picture": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    "role": "alumni"
  }
}
```


---

### 4. Get My Posts
`GET /api/opportunities/my-posts`

**Response (200)**:
```json
[
  {
    "id": "uuid-opp-123",
    "title": "Software Engineer",
    "company": "Google",
    "status": "open",
    "posted_at": "2024-03-23",
    "deadline": "2024-04-01"
  }
]
```


---

### 5. Update Opportunity
`PUT /api/opportunities/:id`  
**Summary**: Allows the poster or an admin to update any field of an opportunity, including media and skills.

**Request**: `multipart/form-data` (Supports both JSON fields and file uploads)
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `title` | String | *Optional* | Updated title |
| `type` | Enum | *Optional* | `job`, `internship`, `freelance` |
| `description`| String | *Optional* | Updated details |
| `requirements`| String | *Optional* | Updated skills needed |
| `location` | String | *Optional* | e.g. `Lahore`, `Remote` |
| `is_remote` | Boolean | *Optional* | Updated remote status |
| `deadline` | Date | *Optional* | Updated close date |
| `company_name`| String | *Optional* | Updated company name |
| `apply_link` | URL | *Optional* | Updated application URL |
| `status` | Enum | *Optional* | `open`, `closed` |
| `required_skills`| String[]| *Optional* | Updated skills list (refreshes all) |
| `media` | File[]/URL[]| *Optional* | Update media (files to add, URLs to keep) |

**Notes**:
- **Skill Refresh**: Providing `required_skills` will replace all existing skills for this opportunity.
- **Media Management**: 
    - To keep existing images/videos, provide their URLs in the `media` field. 
    - To add new media, upload files in the `media` field.
    - Total media count is still limited to 5.

**Response (200)**:
```json
{ "message": "Opportunity updated successfully." }
```

---

### 6. Delete Opportunity
`DELETE /api/opportunities/:id`

**Response (200)**:
```json
{ "message": "Opportunity removed successfully." }
```

---

## 🔎 Search & Discovery
Requires `Bearer JWT`.

### 1. General User Search
`GET /api/search/users`  
**Summary**: Search for all users (students and alumni) using multiple criteria. Excludes admins.

**Query Parameters**:
| Parameter | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `display_name` | String | *Optional* | Partial name search |
| `company` | String | *Optional* | Current employer |
| `skill` | String | *Optional* | Specific skill name |
| `batch_year` | String | *Optional* | Graduation year |
| `degree` | String | *Optional* | Degree program |

**Response (200)**:
```json
[
  {
    "id": "uuid-user-123",
    "display_name": "Hammad Ismail",
    "username": "hammad_i",
    "email": "hammad@uet.edu.pk",
    "current_company": "Google",
    "role": "Software Engineer",
    "skills": ["TypeScript", "NestJS"],
    "batch": "2021-2025",
    "profile_picture": "https://cloudinary.com/ahmed_profile.jpg",
    "bio": "Software engineer with 5 years of experience.",
    "backDropImage": "https://cloudinary.com/ahmed_backdrop.jpg"
  }
]
```

---

### 2. General Opportunities Search
`GET /api/search/opportunities`  
**Summary**: Filter career postings.

**Query Parameters**:
| Parameter | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `title` | String | *Optional* | Job title |
| `type` | String | *Optional* | `job`, `internship`, `freelance` |
| `skill` | String | *Optional* | Required skill |
| `location` | String | *Optional* | City |
| `is_remote` | String | *Optional* | `true` or `false` |

**Response (200)**:
```json
[
  {
    "id": "uuid-opp-123",
    "title": "Backend Developer",
    "type": "job",
    "company": "Google",
    "location": "Remote",
    "is_remote": true,
    "apply_link": "https://google.com/careers",
    "posted_by": {
      "id": "uuid-user-123",
      "display_name": "Ahmed Hassan",
      "username": "ahmed_h",
      "profile_picture": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      "role": "alumni"
    },
    "posted_at": "2024-03-23",
    "deadline": "2024-04-01",
    "media": ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
  }
]
```

---

### 3. Exact User Lookup
`GET /api/search/user/:username`  
**Summary**: Finds a unique user profile by their exact `@username`.

**Response (200)**:
```json
{
  "id": "uuid-user-123",
  "username": "ahmed_h",
  "display_name": "Ahmed The Dev",
  "profile_picture": "https://cloudinary.com/ahmed_profile.jpg",
  "bio": "Passionate software engineer from UET Faisalabad.",
  "role": "alumni",
  "opportunities_count": 5,
  "degree": "BSCS",
  "graduation_year": 2024,
  "batch": "2020-2024",
  "linkedin_url": "https://linkedin.com/in/ahmed",
  "company": "Google",
  "job_role": "Software Engineer",
  "skills": ["Node.js", "Neo4j"]
}
```

---

### 4. User Search Suggestions
`GET /api/search/suggestions`  
**Summary**: Retrieves real-time user suggestions for "search-as-you-type" dropdowns. Matches both `username` and `display_name`.

**Query Parameters**:
| Parameter | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `q` | String | **Required** | Search query (min 2 characters) |

**Response (200)**:
```json
[
  {
    "id": "uuid-user-123",
    "username": "hammad_i",
    "display_name": "Hammad Ismail",
    "profile_picture": "https://cloudinary.com/pic.jpg",
    "role": "alumni"
  }
]
```

---

## 🛠 Skills
Shared skill management. Requires `Bearer JWT`.

### 1. All System Skills
`GET /api/skills/all`  
**Summary**: Retrieves a list of all skills available in the platform.

**Response (200)**: `["Node.js", "React", "Python", "TypeScript", "Neo4j", ...]`

---

### 2. Remove Skill
`DELETE /api/skills/:skill_id`  
**Summary**: Removes a skill from the authenticated user's profile. Accessible by both students and alumni.

**Response (200)**:
```json
{ "message": "Skill removed successfully." }
```

---

## 📊 Network Science
Advanced graph analytics. Requires `Bearer JWT`. Restriction: `admin`.

### 1. Influential Alumni (Centrality)
`GET /api/network/centrality`  
**Summary**: Retrieves top alumni based on the count of their **accepted** connections.
**Response (200)**:
```json
[
  {
    "alumni_id": "uuid-alumni-123",
    "display_name": "Hammad Ismail",
    "connections_count": 50,
    "centrality_score": 0.5
  }
]
```

---

### 2. Degree of Separation (Shortest Path)
`GET /api/network/shortest-path`  
**Summary**: Finds the shortest path through **accepted** connections only.
**Query Parameters**:
| Parameter | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `from` | UUID | **Required** | Source User ID |
| `to` | UUID | **Required** | Target User ID |

**Response (200)**:
```json
{
  "path": ["Hammad Ismail", "Ahmed Hassan", "Ali Khan"],
  "hops": 2
}
```

---

### 3. Top Alumni Employers
`GET /api/network/top-companies`  
**Response (200)**:
```json
[
  {
    "company": "Google",
    "alumni_count": 25
  }
]
```

---

### 4. Skill Supply vs Demand (Trends)
`GET /api/network/skill-trends`  
**Summary**: Analyze skill supply and demand. Restricted to `admin`, `alumni`, and `student`.
**Response (200)**:
```json
{
  "most_required_in_opportunities": ["TypeScript", "Node.js", "Python"],
  "most_common_among_alumni": ["Python", "Java", "SQL"],
  "gap": ["Rust", "Go", "Kubernetes"]
}
```

---

### 5. Career Batch Analysis
`GET /api/network/batch-analysis`  
**Summary**: Engagement and success metrics by batch (based on **accepted** connections).
**Response (200)**:
```json
[
  {
    "batch": "2021-2025",
    "total_alumni": 100,
    "top_companies": ["Google", "Microsoft"],
    "top_roles": ["Software Engineer"],
    "avg_connections": 15
  }
]
```

---

## 📬 Notifications
Requires `Bearer JWT`. Notifications are both **persisted in Neo4j** and **delivered in real-time** via Socket.io for online users.

### Notification Types
| `type` | When it is sent |
| :--- | :--- |
| `connection_request` | An alumni or student sends a connection request |
| `connection_accepted` | The recipient accepts a connection request |
| `account_approved` | Admin approves a pending user account |
| `account_rejected` | Admin rejects a pending user account |
| `new_opportunity` | An alumni/admin posts a new opportunity (broadcast to all) |

### Notification Payload Structure
```typescript
interface NotificationPayload {
  id: string;          // UUID of the notification
  message: string;     // Human-readable message
  type: string;        // See notification types above
  created_at: string;  // ISO 8601 timestamp
  is_read: boolean;    // Whether it has been read
  sender_username?: string | null;
  sender_display_name?: string | null;
  sender_profile_picture?: string | null;
  reference_link?: string | null; // Only for 'new_opportunity' and 'connection_request'
}
```

---

### 1. Get My Notifications
`GET /api/notifications`  
**Summary**: Retrieves notifications for the authenticated user, ordered newest first. Supports filtering by read status.

**Query Parameters**:
| Parameter | Type | Status | Description |
+| :--- | :--- | :--- | :--- |
+| `read` | String | *Optional* | Filter by read status (`true` or `false`). Returns all if omitted. |

**Response (200)**:
```json
[
  {
    "id": "uuid-notification-123",
    "message": "Ahmed Hassan sent you a mentor connection request.",
    "type": "connection_request",
    "created_at": "2024-03-23T12:00:00Z",
    "is_read": false,
    "sender_username": "ahmed123",
    "sender_display_name": "Ahmed Hassan",
    "sender_profile_picture": "https://example.com/ahmed.jpg",
    "reference_link": "/network/requests"
  },
  {
    "id": "uuid-notification-789",
    "message": "New opportunity at Google: Software Engineer",
    "type": "new_opportunity",
    "created_at": "2024-03-24T10:00:00Z",
    "is_read": false,
    "sender_username": "hammad_i",
    "sender_display_name": "Google",
    "sender_profile_picture": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    "reference_link": "/opportunities/uuid-opp-123"
  }
]
```

---

### 2. Mark as Read
`PATCH /api/notifications/:id/read`
**Summary**: Marks a specific notification as read.

**Response (200)**:
```json
{ "message": "Notification marked as read." }
```

---

### 3. Clear All Notifications
`DELETE /api/notifications/all`
**Summary**: Removes all notifications for the authenticated user.

**Response (200)**:
```json
{ "message": "All notifications cleared." }
```

---

### 4. Delete Specific Notification
`DELETE /api/notifications/:id`
**Summary**: Permanently removes a single notification.

**Response (200)**:
```json
{ "message": "Notification deleted successfully." }
```

---

## 🔌 Real-time Notifications (WebSocket)
The backend exposes a **Socket.io** gateway for real-time notification delivery. Notifications are pushed to connected clients instantly when they are created.

### Connection
- **Server URL**: `https://unison-backend-lxmu.onrender.com/` (production) / `http://localhost:5000` (development)
- **Library**: `socket.io-client`

### Authentication
Every connection **must** provide a valid JWT. If the token is missing or invalid, the connection is immediately rejected.

**Option 1 — Authorization Header (Recommended):**
```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  extraHeaders: {
    Authorization: `Bearer ${YOUR_JWT_TOKEN}`
  }
});
```

**Option 2 — Query Parameter (Fallback):**
```javascript
const socket = io("http://localhost:5000", {
  query: { token: YOUR_JWT_TOKEN }
});
```

### Events

#### `notification` (server → client)
Fired when a new notification is created for the authenticated user.
```javascript
socket.on("notification", (data) => {
  // data: NotificationPayload
});
```

#### `new_message` (server → client)
Fired when a new message is received.
```javascript
socket.on("new_message", (data) => {
  // data: { _id, conversationId, senderId, content, createdAt, isRead: false }
});
```

#### `typing_status` (server → client)
Fired when a participant starts or stops typing.
```javascript
socket.on("typing_status", (data) => {
  // data: { senderId, isTyping: boolean }
});
```

#### `message_read` (server → client)
Fired when your message is read by the recipient.
```javascript
socket.on("message_read", (data) => {
  // data: { messageId, conversationId, readAt }
});
```

#### `messages_read` (server → client)
Fired when multiple messages in a conversation are marked as read.
```javascript
socket.on("messages_read", (data) => {
  // data: { conversationId, readAt, messageIds: [] }
});
```

#### `user_online` / `user_offline` (server → client)
Fired when a connected friend goes online or offline.
```javascript
socket.on("user_online", (data) => {
  // data: { userId, last_seen }
});
socket.on("user_offline", (data) => {
  // data: { userId, last_seen }
});
```

### Client Events (client → server)

#### `typing`
Emit this to inform a recipient that you are typing.
```javascript
socket.emit("typing", {
  receiverId: "uuid-target",
  isTyping: true // or false
});
```

#### `connect_error` (server → client)
Fired if authentication fails or the server is unreachable.
```javascript
socket.on("connect_error", (error) => {
  console.error("Socket connection failed:", error.message);
});
```

### Best Practices
1. **React Context**: Wrap the socket instance in a `Context.Provider` so all components share the same listener.
2. **Reconnection**: Socket.io handles reconnection automatically. Re-verify the token if it expires since the initial connect.
3. **Cleanup**: Disconnect the socket on component unmount or user logout:
   ```javascript
   socket.disconnect();
   ```
4. **Dual-source**: On app load, call `GET /api/notifications` to fetch historical notifications, then use the socket to append new ones in real time.

---

## 💬 Chat (Messaging)
Real-time messaging using MongoDB + Socket.io. Requires `Bearer JWT`. Participants must be 'connected'.

### 1. Upload Chat Image
`POST /api/chat/upload`
**Summary**: Uploads an image to be sent in a message.
**Constraints**: 
- Max File Size: **5 MB**.
- Form Field Name: `file`.
- Allowed Extensions: `.png`, `.jpg`, `.jpeg`, `.webp`.

**Request**: `multipart/form-data`
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `file` | Binary | **Required** | The image file |

**Response (201)**:
```json
{
  "url": "https://cloudinary.com/...",
  "publicId": "chat_images/abc123"
}
```

---

### 2. Send Message
`POST /api/chat/messages`
**Summary**: Sends a text or image message to a connected user.

**Request Body**:
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `receiverId` | String | **Required** | UUID of the recipient user |
| `content` | String | **Required** | Message text (or caption/filename for images) |
| `messageType` | Enum | **Required** | `text` or `image` (Default: `text`) |
| `imageUrl` | String | *Optional* | URL received from the Upload endpoint (Required if type is `image`) |

**Response (201)**:
```json
{
  "_id": "60d5ec...",
  "conversationId": "60d5ec...",
  "senderId": "uuid-sender",
  "content": "Check out this photo!",
  "messageType": "image",
  "imageUrl": "https://cloudinary.com/...",
  "isRead": false,
  "createdAt": "2024-03-23T10:00:00Z"
}
```
*(Note: A `new_message` push event and socket event will immediately be sent to the receiver)*

---

---

### 3. Get Conversations (Inbox)
`GET /api/chat/conversations`
**Summary**: Retrieves all chat threads for the logged-in user.

**Response (200)**:
```json
[
  {
    "_id": "uuid-conversation",
    "participants": ["uuid-1", "uuid-2"],
    "updatedAt": "2024-03-23T10:00:00Z",
    "lastMessage": {
      "content": "Hello there!",
      "isRead": false,
      "createdAt": "2024-03-23T10:00:00Z"
    },
    "participantProfile": {
      "id": "uuid-2",
      "display_name": "Ali Khan",
      "profile_picture": "https://img.com/pic.jpg",
      "username": "ali_k",
      "is_online": true,
      "last_seen": "2024-03-23T10:00:00Z"
    }
  }
]
```

---

### 4. Get Messages (Chat History)
`GET /api/chat/conversations/:participantId/messages`
**Summary**: Retrieves chronological message history with a specific user.

**Response (200)**:
```json
[
  {
    "_id": "60d5ec...",
    "senderId": "uuid-sender",
    "content": "Hello there!",
    "isRead": true,
    "createdAt": "2024-03-23T09:55:00Z"
  }
]
```

---

### 5. Mark Message as Read
`PATCH /api/chat/messages/:messageId/read`
**Summary**: Marks a message as read.

**Response (200)**:
```json
{ "success": true }
```

---

### 6. Mark Conversation as Read
`PATCH /api/chat/conversations/:participantId/read`
**Summary**: Marks all unread messages from a specific participant as read.

**Response (200)**:
```json
{ "success": true }
```

---

### 7. Edit Message
`PATCH /api/chat/messages/:messageId`  
**Summary**: Modifies the content of a message.  
**Constraint**: Can only be done within **3 minutes** of sending.

**Request Body**:
```json
{ "content": "Updated message text" }
```

**Response (200)**:
```json
{
  "_id": "60d5ec...",
  "content": "Updated message text",
  "isEdited": true,
  "createdAt": "2024-03-23T10:00:00Z"
}
```

---

### 8. Delete Message
`DELETE /api/chat/messages/:messageId`  
**Summary**: Soft-deletes a message for both participants.  
**Constraint**: Can only be done within **3 minutes** of sending.

**Response (200)**:
```json
{ "success": true }
```

---

### 9. Clear Chat
`DELETE /api/chat/conversations/:conversationId/clear`  
**Summary**: Clears the chat history for the **current user** only. The other participant still sees the history.

**Response (200)**:
```json
{ "success": true }
```

---

## 📅 Events
Module for managing and discovering alumni events, webinars, and reunions. Requires `Bearer JWT`.

### 1. Create Event
`POST /api/events`  
**Role Restriction**: `admin`, `alumni`  
**Request**: `multipart/form-data`
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `title` | String | **Required** | Event title |
| `description` | String | **Required** | Detailed description |
| `type` | Enum | **Required** | `reunion`, `webinar`, `workshop`, `networking`, `other` |
| `date` | DateString | **Required** | ISO 8601 format |
| `is_online` | Boolean | **Required** | True for online events |
| `location` | String | *Optional* | Venue or platform name |
| `meeting_link` | URL | *Optional* | Link for online events |
| `max_attendees`| Number | *Optional* | Max capacity |
| `banner` | File | *Optional* | Image file (png, jpg, webp) |

**Response (201)**:
```json
{
  "message": "Event created successfully.",
  "eventId": "uuid-123"
}
```

---

### 2. Update Event
`PUT /api/events/:id`  
**Role Restriction**: `admin`, `alumni` (Owner only)  
**Request**: `multipart/form-data` (Supports partial updates)

**Response (200)**:
```json
{ "message": "Event updated successfully." }
```

---

### 3. Delete/Cancel Event
`DELETE /api/events/:id`  
**Role Restriction**: `admin`, `alumni` (Owner only)

**Response (200)**:
```json
{ "message": "Event cancelled successfully." }
```

---

### 4. List Events
`GET /api/events`  
**Summary**: Discover upcoming or past events.

**Query Parameters**:
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `type` | String | Filter by type |
| `is_online`| Boolean | Filter online/offline |
| `status` | Enum | `upcoming` (default) or `past` |
| `limit` | Number | Default 20 |
| `offset` | Number | Default 0 |

**Response (200)**:
```json
[
  {
    "id": "uuid-123",
    "title": "Alumni Meetup",
    "type": "reunion",
    "date": "2024-12-01T18:00:00Z",
    "is_online": false,
    "location": "UET Campus",
    "banner_url": "...",
    "attendee_count": 50,
    "max_attendees": 100,
    "host": {
      "id": "uuid-host",
      "name": "Hammad Ismail",
      "profile_picture": "..."
    }
  }
]
```

---

### 5. Get Event Details
`GET /api/events/:id`  
**Summary**: Detailed view of a specific event.

**Response (200)**:
```json
{
  "id": "uuid-123",
  "title": "Alumni Meetup",
  "description": "...",
  "type": "reunion",
  "date": "2024-12-01T18:00:00Z",
  "is_online": false,
  "location": "UET Campus",
  "meeting_link": null,
  "max_attendees": 100,
  "banner_url": "...",
  "attendee_count": 50,
  "my_rsvp_status": "attending",
  "host": {
    "id": "uuid-host",
    "name": "Hammad Ismail",
    "username": "hammad_i",
    "profile_picture": "...",
    "role": "alumni"
  }
}
```

---

### 6. RSVP to Event
`POST /api/events/:id/rsvp`  
**Request Body**:
```json
{ "status": "attending" } 
```
**Status Options**: `attending`, `maybe`

**Response (201)**:
```json
{ "message": "RSVP status updated to attending." }
```

---

### 7. Cancel RSVP
`DELETE /api/events/:id/rsvp`

**Response (200)**:
```json
{ "message": "RSVP cancelled successfully." }
```

---

### 8. Get Event Attendees
`GET /api/events/:id/attendees`

**Response (200)**:
```json
[
  {
    "id": "uuid-user",
    "display_name": "Ali Khan",
    "username": "ali_k",
    "profile_picture": "...",
    "role": "student",
    "bio": "..."
  }
]
```

---

### 9. Get My Events
`GET /api/events/my-events`  
**Summary**: Returns events created by the user or RSVP'd to.

**Response (200)**: same as List Events.

