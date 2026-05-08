# UNISON Backend Architectural Schema & Design Reasoning

This document outlines the architectural decisions and data schemas for the UNISON platform. It serves as a technical reference for presentations and development.

---

## 1. High-Level Architecture
UNISON follows a **Modular Monolith** architecture built with **NestJS**, leveraging a **Hybrid Database Strategy**. This approach combines the strengths of Document-based storage and Graph-based relationships.

### Core Stack
- **Framework**: NestJS (TypeScript)
- **Primary API**: REST / GraphQL (Transitioning)
- **Real-time**: Socket.io (WebSockets)
- **Databases**: MongoDB (Mongoose) & Neo4j (Cypher)
- **Storage**: Cloudinary (Media assets)

---

## 2. Hybrid Database Strategy

| Feature | Database | Reasoning |
| :--- | :--- | :--- |
| **Authentication & Auth Logs** | MongoDB | Fast lookups for JWT validation and transactional integrity for OTPs. |
| **User Profiles** | Neo4j | Profiles are the "Nodes" of our social graph. Attributes like skills and roles are best stored here for relationship mapping. |
| **Networking (Connections)** | Neo4j | **Native Graph Support.** Querying "Mutual Connections" or "Path to Alumnus" is O(1) or O(n) compared to complex joins in SQL/NoSQL. |
| **Opportunities & Jobs** | Neo4j | Jobs are linked to Skills and Posters. Graph queries allow for "Jobs matching your skills" features efficiently. |
| **Chat & Notifications** | MongoDB | High-write throughput and simple retrieval by ID. Document-based storage is ideal for message history. |
| **Activity Feed** | MongoDB | Time-series like data that is mostly appended and rarely modified. Flexible schema allows for different activity types. |

---

## 3. Data Schemas

### A. MongoDB (Mongoose)

#### `UserAuth` (Authentication)
- **Fields**: `userId`, `email`, `password`, `account_status` (pending/approved/rejected), `role`, `rejection_reason`.
- **Reasoning**: Decouples authentication from profile data. Allows for rapid account status checks without querying the graph.

#### `Chat` (Conversations & Messages)
- **Conversation**: `participants` (User IDs), `lastMessage`.
- **Message**: `conversationId`, `senderId`, `content`, `isRead`, `readAt`.
- **Reasoning**: Messages are naturally hierarchical documents. MongoDB's indexing on `conversationId` ensures millisecond response times for chat history.

#### `Notification`
- **Fields**: `recipientId`, `message`, `type`, `is_read`, `sender_context` (username, profile pic), `reference_link`.
- **Reasoning**: Notifications are transient and high-volume. Mongo handles this scale efficiently. Using a document store allows for easy inclusion of rich metadata without rigid schema constraints.

#### `Activity`
- **Fields**: `type`, `description`, `related_id`, `created_at`.
- **Reasoning**: Acts as an audit log. MongoDB's capped collections or simple indexes on `created_at` make it perfect for chronological event tracking.

### B. Neo4j (Graph)

#### Nodes
1. **User**: `id`, `username`, `display_name`, `role`, `bio`, `profile_picture`, `backDropImage`, `degree`, `semester`, `batch`.
2. **Skill**: `id`, `name` (unique), `category`.
3. **WorkExperience**: `company_name`, `role`, `start_date`, `end_date`, `is_current`.
4. **Opportunity**: `id`, `title`, `type`, `description`, `requirements`, `location`, `is_remote`, `deadline`, `status`.

#### Relationships
- `(User)-[:CONNECTED_TO {status: 'accepted'}]->(User)`: The core social graph.
- `(User)-[:HAS_SKILL {proficiency_level}]->(Skill)`: Allows searching for "Experts in TypeScript".
- `(User)-[:HAS_EXPERIENCE]->(WorkExperience)`: Captures professional history.
- `(User)-[:POSTED]->(Opportunity)`: Tracks who created which job/internship.
- `(Opportunity)-[:REQUIRES_SKILL]->(Skill)`: Facilitates recommendation engines (e.g., matching users to jobs based on shared skills).

---

## 4. Key Architectural Patterns

### 1. The Gateway Pattern
We use **Socket.io Gateways** for real-time features. When a user sends a message, it is persisted in MongoDB and simultaneously broadcasted via the gateway to the recipient's active socket session.

### 2. Status-Based Access Control
The `account_status` in `UserAuth` acts as a global kill-switch. Only `approved` users can interact with the graph, ensuring a curated community (especially for Alumni).

### 3. Media Handling
We don't store binary data in our DBs. **Cloudinary** handles image optimization and CDN delivery, while we only store the `secure_url` in Neo4j.

---

## 5. Strategic Scaling & Potential Improvements

Based on the current architecture, the following areas are identified for evolution as the platform scales. These points address distributed consistency, data integrity, and performance.

### 1. Distributed Consistency (Data Sync Risk)
*   **Challenge**: The hybrid nature of our stack (MongoDB + Neo4j) introduces "Distributed Transaction" risks.
*   **Status: Implemented**: Added **Rollback/Compensation Logic** in the Admin Service. Critical status and role updates are now wrapped in error-handling blocks that revert changes in Neo4j if the MongoDB update fails.

### 2. Data Retention & Compliance (Soft Deletes)
*   **Challenge**: Destructive `DETACH DELETE` prevents data recovery and breaks historical references.
*   **Status: Implemented**: Migrated to **State-Based Deletions**. All delete endpoints now use an `is_deleted` flag, preserving data for auditability while excluding it from active queries via global filters.

### 3. Schema Integrity (Neo4j Constraints)
*   **Challenge**: Schema-less graph database relies on application-level logic to prevent duplicates.
*   **Status: Implemented**: Enforced **Native Uniqueness Constraints** and indices on `User(id, username, email)`, `Opportunity(id)`, and `Skill(name)` via an automated initialization script.

### 4. Advanced Search Performance
*   **Challenge**: `CONTAINS` queries are slow and lack fuzzy matching.
*   **Status: Implemented**: Integrated **Neo4j Full-Text Search Indices** (`user_search_index`, `opportunity_search_index`). Search queries now utilize Lucene-based fuzzy matching (`~`) for high-performance, typo-tolerant results.

---

**Prepared by**: Antigravity (AI Architect)
**Project**: UNISON Backend
