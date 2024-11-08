require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs").promises;
const axios = require("axios");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "https://ammaaralam.com",
      "http://localhost:3000",
      "http://localhost:1170",
      "https://webchat.ammaar.xyz",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});
app.use(express.static(path.join(__dirname)));

// File paths for storage
const STORAGE_DIR = path.join(__dirname, "storage");
const ROOMS_FILE = path.join(STORAGE_DIR, "rooms.json");

// In-memory storage
let rooms = new Map();

// ChatRoom class definition
class ChatRoom {
  constructor(password = null, messages = []) {
    this.password = password;
    this.messages = messages;
    this.users = new Map();
    this.maxMessages = 100;
  }

  addUser(socketId, username) {
    this.users.set(socketId, username);
  }

  removeUser(socketId) {
    this.users.delete(socketId);
  }

  getUsers() {
    return Array.from(this.users.values());
  }

  addMessage(message) {
    if (!message) return;
    this.messages.push(message);
    if (this.messages.length > this.maxMessages) {
      this.messages.shift();
    }
    return message;
  }
}

// Storage functions
async function initStorage() {
  try {
    // Create storage directory if it doesn't exist
    await fs.mkdir(STORAGE_DIR, { recursive: true });

    // Load existing rooms
    try {
      const data = await fs.readFile(ROOMS_FILE, "utf8");
      const savedRooms = JSON.parse(data);

      for (const [roomName, roomData] of Object.entries(savedRooms)) {
        const room = new ChatRoom(roomData.password, roomData.messages);
        rooms.set(roomName, room);
      }
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw err;
      }
      // File doesn't exist yet, start with empty rooms
      await saveRooms();
    }
  } catch (err) {
    console.error("Failed to initialize storage:", err);
    throw err;
  }
}

async function saveRooms() {
  try {
    const roomsData = {};
    for (const [name, room] of rooms.entries()) {
      roomsData[name] = {
        password: room.password,
        messages: room.messages,
      };
    }
    await fs.writeFile(ROOMS_FILE, JSON.stringify(roomsData, null, 2));
  } catch (err) {
    console.error("Failed to save rooms:", err);
    throw err;
  }
}

// Sync functionality
const SYNC_SERVER = process.env.SYNC_SERVER || "https://webchat.ammaar.xyz";
const SYNC_ENABLED = process.env.SYNC_ENABLED === "true";

async function syncAllRooms() {
  if (!SYNC_ENABLED) return;

  try {
    const response = await axios.get(`${SYNC_SERVER}/api/sync/rooms`, {
      headers: { Authorization: `Bearer ${process.env.SYNC_TOKEN}` },
    });

    const syncedRooms = response.data.rooms;
    for (const [roomName, roomData] of Object.entries(syncedRooms)) {
      if (!rooms.has(roomName)) {
        const room = new ChatRoom(roomData.password, roomData.messages);
        rooms.set(roomName, room);
      }
    }
    await saveRooms();
  } catch (err) {
    console.error("Failed to sync all rooms:", err);
  }
}

// API endpoints
app.get("/api/sync/rooms", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.SYNC_TOKEN}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const roomsData = {};
    for (const [name, room] of rooms.entries()) {
      roomsData[name] = {
        password: room.password,
        messages: room.messages,
      };
    }
    res.json({ rooms: roomsData });
  } catch (err) {
    console.error("Error getting rooms:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Socket.IO event handlers remain mostly the same, just remove MongoDB references
// ... rest of your socket.io code ...

// Initialize storage and start server
initStorage().then(() => {
  const PORT = process.env.PORT || 1170;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Start periodic sync
  if (SYNC_ENABLED) {
    setInterval(syncAllRooms, 5 * 60 * 1000); // Every 5 minutes
  }
});
