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

**Request Body**:
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `verified_token` | String | **Required** | Token received from Verify OTP endpoint |
| `username` | String | **Required** | Unique identifier (e.g., `ahmed_h`) |
| `display_name` | String | **Required** | Preferred name |
| `email` | String | **Required** | Must match verified email |
| `password` | String | **Required** | Min 8 characters |
| `role` | Enum | **Required** | `alumni` or `student` |
| `roll_number` | String | **Required** | University ID (e.g., `2021-CS-101`) |
| `degree` | String | **Required** | e.g., `BS Computer Science` |
| `graduation_year`| Number | *Optional* | **Alumni Only** (Required for graduates) |
| `semester` | Number | *Optional* | **Student Only** (Required for students) |

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
    "display_name": "Zainab Ahmed",
    "email": "zainab@uet.edu.pk",
    "role": "student",
    "registered_at": "2024-03-23T10:00:00Z",
    "profile_picture": "https://res.cloudinary.com/demo/image/upload/sample.jpg"
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

### 4. Dashboard Statistics
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

### 7. Remove Account
`DELETE /api/admin/remove-account/:id`  
**Summary**: Permanently deletes a user account from the system.

**Response (200)**:
```json
{ "message": "Account removed successfully." }
```

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

### 10. Get Recent Activity
`GET /api/admin/recent-activity`  
**Summary**: Retrieves a list of recent platform activities (registrations, approvals, posts, etc.).

**Query Parameters**:
| Parameter | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `limit` | Number | Optional | Number of activities to return (default: 10) |

**Response (200)**:
```json
[
  {
    "id": "uuid-activity-1",
    "type": "USER_REGISTERED",
    "description": "New alumni registered: Sarah Chen",
    "created_at": "2024-03-23T10:00:00Z"
  },
  {
    "id": "uuid-activity-2",
    "type": "ACCOUNT_APPROVED",
    "description": "Account approved for John Smith",
    "created_at": "2024-03-23T10:15:00Z"
  }
]
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
  "work_experiences": [...],
  "detailed_skills": [...]
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

### 7. Remove Skill
`DELETE /api/alumni/skills/:skill_id`

**Response (200)**:
```json
{ "message": "Skill removed successfully." }
```

---

### 8. Get Professional Network
`GET /api/alumni/network`  
**Summary**: Retrieves a list of all accepted connections.

**Response (200)**:
```json
[
  {
    "id": "uuid-123",
    "display_name": "Ali Khan",
    "company": "Microsoft",
    "role": "Product Manager",
    "connection_type": "colleague"
  }
]
```

---

### 9. Connect with User
`POST /api/alumni/connect/:target_id`  
**Summary**: Sends a connection request to another user.

**Request Body**:
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `connection_type` | Enum | **Required** | `batchmate`, `colleague`, `mentor` |

**Response (201)**:
```json
{ "message": "Connection request sent successfully." }
```

---

### 10. Get Pending Requests
`GET /api/alumni/connections/requests`  
**Summary**: Lists incoming connection requests.

**Response (200)**:
```json
[
  {
    "sender_id": "uuid-sender-123",
    "sender_display_name": "Zainab Ahmed",
    "sender_username": "zainab",
    "sender_profile_picture": "https://cloudinary.com/profile.jpg",
    "connection_type": "mentor",
    "requested_at": "2024-03-23T10:00:00Z"
  }
]
```

---

### 11. Respond to Request
`PATCH /api/alumni/connections/requests/:sender_id/respond`  
**Summary**: Accept or reject a request.

**Request Body**:
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `action` | Enum | **Required** | `accept` or `reject` |

**Response (200)**:
```json
{ "message": "Connection request accepted." }
```

---

### 12. Find Batch Mates
`GET /api/alumni/batch-mates`  
**Summary**: Discovery based on graduation year.

**Response (200)**:
```json
[
  {
    "id": "uuid-123",
    "display_name": "Ali Khan",
    "company": "Microsoft",
    "role": "Product Manager",
    "connection_type": "batchmate"
  },
  {
    "id": "uuid-456",
    "display_name": "Zainab Ahmed",
    "company": null,
    "role": null,
    "connection_type": null
  }
]
```

> **Fields**: `id` (always present), `display_name` (always present), `company` / `role` / `connection_type` are optional and may be `null` if not set.

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
  "profile_picture": "https://cloudinary.com/ali_pro.jpg"
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

### 4. Mentor Discovery
`GET /api/student/mentors`  
**Summary**: Suggests alumni as potential mentors.

**Response (200)**:
```json
[
  {
    "alumni_id": "uuid-alumni-123",
    "display_name": "Ahmed Hassan",
    "domain": "Programming",
    "company": "Google"
  }
]
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
**Request Body**: `title`, `description`, `apply_link`, `deadline`, `status`

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

### 1. General Alumni Search
`GET /api/search/alumni`  
**Summary**: Search for graduates using multiple criteria.

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
    "id": "uuid-alumni-123",
    "display_name": "Hammad Ismail",
    "username": "hammad_i",
    "email": "hammad@uet.edu.pk",
    "current_company": "Google",
    "role": "Software Engineer",
    "skills": ["TypeScript", "NestJS"],
    "batch": "2021-2025",
    "profile_picture": "https://cloudinary.com/ahmed_profile.jpg"
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
  "role": "alumni",
  "degree": "BSCS",
  "graduation_year": 2024,
  "company": "Google",
  "job_role": "Software Engineer",
  "skills": ["Node.js", "Neo4j"],
  "linkedin_url": "https://linkedin.com/in/ahmed",
  "profile_picture": "https://cloudinary.com/ahmed_profile.jpg"
}
```

---

### 4. All System Skills
`GET /api/skills/all`  
**Summary**: Retrieves a static list of all skills.

**Response (200)**: `["Node.js", "React", "Python", "TypeScript", "Neo4j", ...]`

---

## 📊 Network Science
Advanced graph analytics. Requires `Bearer JWT`. Restriction: `admin`, `alumni`.

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
Requires `Bearer JWT`.

### 1. Get My Notifications
`GET /api/notifications`  
**Response (200)**:
```json
[
  {
    "id": "uuid-notification-123",
    "message": "New connection request from Ahmed Hassan.",
    "type": "connection_request",
    "created_at": "2024-03-23T12:00:00Z",
    "is_read": false
  }
]
```

---

### 2. Mark as Read
`PATCH /api/notifications/:id/read`  
**Response (200)**:
```json
{ "message": "Notification marked as read." }
```
