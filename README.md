# PrivTalk 💬

A real-time private chat application built with Node.js, Express, MongoDB, Socket.io, and React.

## Tech Stack

- **Frontend**: React + Vite, Zustand, DaisyUI, Lucide Icons
- **Backend**: Node.js, Express.js, MongoDB + Mongoose
- **Real-Time**: Socket.io
- **Auth**: JWT (stored in HTTP-only cookies)
- **Storage**: Cloudinary (images & videos)

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB Atlas account or local MongoDB
- Cloudinary account

### Setup

```bash
# Install root deps
npm install

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### Environment Variables

Create `backend/.env`:

```
PORT=5001
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NODE_ENV=development
```

### Run Locally

```bash
# Start backend
cd backend && npm run dev

# Start frontend (new terminal)
cd frontend && npm run dev
```

## API Endpoints

### Auth Routes (`/api/auth`)

| Method | Path              | Description                  |
| ------ | ----------------- | ---------------------------- |
| POST   | `/signup`         | Register a new user          |
| POST   | `/login`          | Login and receive JWT cookie |
| POST   | `/logout`         | Clear auth cookie            |
| PUT    | `/update-profile` | Update profile picture       |
| GET    | `/check`          | Check current auth state     |

### Message Routes (`/api/messages`)

| Method | Path                        | Description                          |
| ------ | --------------------------- | ------------------------------------ |
| GET    | `/users`                    | Get all users for sidebar            |
| GET    | `/search/:userId?q=keyword` | Search messages with a user          |
| GET    | `/:userId`                  | Get full message history with a user |
| POST   | `/send/:userId`             | Send a message (text/image/video)    |
| DELETE | `/:messageId`               | Delete own message                   |

## Socket Events

| Event (Client → Server) | Description                              |
| ----------------------- | ---------------------------------------- |
| `typingStart`           | Notify receiver that user started typing |
| `typingStop`            | Notify receiver that user stopped typing |

| Event (Server → Client) | Description                       |
| ----------------------- | --------------------------------- |
| `getOnlineUsers`        | List of currently online user IDs |
| `newMessage`            | New message received in real-time |
| `userTyping`            | Another user started typing       |
| `userStoppedTyping`     | Another user stopped typing       |

## Features

- 🔐 JWT Authentication with HTTP-only cookies
- 💬 Real-time messaging via Socket.io
- ⌨️ Typing indicators
- 🖼️ Image & video sharing via Cloudinary
- 🔍 Message search
- 🗑️ Delete your own messages
- 🟢 Online presence indicators
- 📱 Responsive UI
