---

## 🎭 Public Profiles
Comprehensive user data for detailed profile views.

### 🖼️ Get User Public Profile
`GET /api/profiles/user/:id`

**Response**: `200 OK`
```json
{
  "id": "uuid-123",
  "username": "hammad_i",
  "display_name": "Hammad Ismail",
  "role": "alumni", // "alumni" or "student"
  "profile_picture": "...",
  "bio": "Software Engineer",
  "degree": "BSCS",
  "batch": "2016-2020",
  "graduation_year": 2020, // (Alumni only)
  "semester": null, // (Student only)
  "roll_number": null, // (Student only)
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
  "is_connection_sender": true
}
```

---

## 🚀 Migration Mapping (Old vs. New)
The following role-specific endpoints have been consolidated into a unified structure. **Update all frontend service calls accordingly.**

| Feature | Old (Alumni) | Old (Student) | **New (Unified)** |
| :--- | :--- | :--- | :--- |
| **Send Request** | `POST .../alumni/connect/:id` | `POST .../student/connect/:id` | `POST /connections/request/:id` |
| **List Requests** | `GET .../alumni/connections/requests` | *N/A* | `GET /connections/requests` |
| **Respond** | `PATCH .../alumni/connections/requests/:id/respond` | *N/A*| `PATCH /connections/requests/:id/respond` |
| **Check Status** | `GET .../alumni/connection-status/:id` | `GET .../student/connection-status/:id` | `GET /connections/status/:id` |
| **Remove/Cancel** | `DELETE .../alumni/connections/:id` | `DELETE .../student/connections/:id` | `DELETE /connections/:id` |

---

This document provides the necessary API specifications for managing user-to-user connections (requests, responses, status, and removal).

**Base URL**: `/api`  
**Authentication**: `Authorization: Bearer <JWT_TOKEN>`

---

## 1. Connection Lifecycle (Unified)

### 📤 Send Connection Request
`POST /api/connections/request/:target_id`

**Payload**:
```json
{
  "connection_type": "mentor" // Options: "batchmate", "colleague", "mentor"
}
```

**Constraints**:
- **Students**: Can ONLY send requests to **Alumni** with type `mentor`.
- **Alumni**: Can send any type to anyone.

**Response**: `201 Created`

---

### 📥 Get Pending Incoming Requests
`GET /api/connections/requests`

**Response**: `200 OK`
```json
[
  {
    "sender_id": "uuid-sender-123",
    "sender_display_name": "Zainab Ahmed",
    "sender_username": "zainab",
    "sender_profile_picture": "https://url.com/pic.jpg",
    "connection_type": "mentor",
    "requested_at": "2024-03-23T10:00:00Z"
  }
]
```

---

### ✅ Respond to Connection Request
`PATCH /api/connections/requests/:sender_id/respond`

**Payload**:
```json
{
  "action": "accept" // Options: "accept", "reject"
}
```

**Response**: `200 OK`

---

### 🔍 Check Connection Status
`GET /api/connections/status/:target_id`

**Response**: `200 OK`
```json
{
  "status": "pending", // OR "connected", "none"
  "is_sender": true    // True if current user is the one who sent the request
}
```

---

### 🗑️ Remove Connection / Cancel Request
`DELETE /api/connections/:target_id`

**Response**: `200 OK`

---

## 2. Role-Specific Connection Lists

### 🎓 Student: Get Mentors (Accepted)
`GET /api/student/connections`

**Response**: `200 OK` (List of accepted Alumni mentors)

---

### 👤 Alumni: Get Network (Accepted)
`GET /api/alumni/connections`

**Response**: `200 OK` (List of accepted colleagues/batch-mates/mentees)

---

## 3. Discovery & Recommendations

### 🌟 Student: Find Potential Mentors
`GET /api/student/mentors`

**Response**: `200 OK` (List of suggested Alumni based on shared skills)

---

### 🎓 Alumni: Find Batch Mates
`GET /api/alumni/batch-mates`

**Response**: `200 OK` (Discovery based on same graduation year)
