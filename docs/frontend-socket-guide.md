# Frontend Notification Service Implementation Guide

This document explains how to integrate the UNISON real-time notification system into your frontend application. **The notification system uses a hybrid approach**, relying on both REST APIs (for history and state mutation) and Socket.io (for real-time push).

## 🏛️ Architecture Overview

To build a robust notification dropdown/center, you must implement three distinct pieces:
1. **Initial Load (REST):** Fetch the history of stored notifications.
2. **Real-time Push (Socket):** Listen for incoming notifications while the user is active online.
3. **State Mutation (REST):** Send a request to the server when a user reads a notification.

---

## 🔗 1. REST APIs (History & State)

### Fetch Notification History
When the user successfully logs into your application, immediately fetch their past notifications.

- **Endpoint:** `GET /api/notifications`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Array of `NotificationPayload` objects (newest first).

### Mark Notification as Read
When the user clicks or views a notification, let the server know so the "unread" dot disappears permanently.

- **Endpoint:** `PATCH /api/notifications/:id/read`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `{ "message": "Notification marked as read." }`

---

## ⚡ 2. Real-time Push (Socket.io)

While the user has the app open, we use Socket.io to push *new* notifications instantly without polling.

- **Server URL:** `https://unison-backend-lxmu.onrender.com/` (prod) or `http://localhost:5000` (dev)
- **Library Needed:** `npm install socket.io-client`

### Establishing the Connection
The gateway requires a valid JWT for authentication.

```javascript
import { io } from "socket.io-client";

// Connect to the root namespace
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000", {
  extraHeaders: {
    Authorization: `Bearer ${USER_JWT_TOKEN}`
  }
});

// Fallback if environment strips custom headers:
// const socket = io("http://localhost:5000", { query: { token: USER_JWT_TOKEN } });
```

### Listening for Events

**`notification`** - The primary event. The payload pushed here exactly matches the payload returned by the REST API.
```javascript
socket.on("notification", (newNotification) => {
  console.log("Real-time notification:", newNotification);
  // Add newNotification to the beginning of your React state array
  // Trigger a toast notification (e.g., react-hot-toast)
});
```

**`connect_error`** - Useful for debugging token rejections.
```javascript
socket.on("connect_error", (error) => {
  console.error("Socket authentication failed:", error.message);
});
```

---

## 📦 3. Data Models / Typing (TypeScript)

For frontend reliability, ensure you use strongly-typed models:

```typescript
export type NotificationType = 
  | "connection_request"
  | "connection_accepted"
  | "account_approved"
  | "account_rejected"
  | "new_opportunity"
  | "new_message";

export interface NotificationPayload {
  id: string;          // UUID of the specific notification
  message: string;     // Ready-to-display human-readable string
  type: NotificationType; // Categorizes the notification for distinct icons/routing
  created_at: string;  // ISO 8601 Date String
  is_read: boolean;    // false initially
  
  // Optional Metadata for enriched notifications
  sender_username?: string | null;
  sender_display_name?: string | null;
  sender_profile_picture?: string | null;
  reference_link?: string | null; // e.g., '/opportunities/123' or '/network'
}
```

---

## 💡 React Implementation Strategy

Here is the standard flow for a React/Next.js frontend using a Context Provider or Zustand store:

1. **On App Load (Auth Success):**
   - Execute `GET /api/notifications`.
   - Store the resulting array in a global state management tool (`setNotifications(data)`).
   
2. **Setup Socket Listener:**
   - Instantiate your `socket`.
   - On the `notification` event, prepend the new object to your state:
     `setNotifications((prev) => [newNotification, ...prev])`
   - Play a sound or show a system toast to grab the user's attention.

3. **User Interaction:**
   - When the user opens the notification dropdown, render the list.
   - If a user clicks an unread notification:
      1. Navigate them to the relevant page (e.g. if `type === 'connection_request'`, route them to `/network`).
      2. Call `PATCH /api/notifications/${id}/read`.
      3. Optimistically update local state: mark `is_read = true` to remove the unread active dot immediately.

4. **Cleanup:**
   - When the user logs out, clear the notification state and call `socket.disconnect()`.
