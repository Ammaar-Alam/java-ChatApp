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

// Socket.IO event handlers
io.on("connection", (socket) => {
  // Correctly retrieve the room list from the Map
  socket.emit("update room list", Array.from(rooms.keys()));

  // Update the way you retrieve all users
  const allUsers = Array.from(rooms.values()).flatMap((room) => room.getUsers());
  socket.emit("update user list", allUsers);
  console.log("New client connected");

  let addedUser = false;
  let currentRoom = "";

  socket.on("disconnect", () => {
    if (addedUser && currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.removeUser(socket.id);
        io.to(currentRoom).emit("update user list", room.getUsers());
        const leaveMessage = {
          systemMessage: true,
          message: `${socket.username} left the chat`,
        };
        room.addMessage(leaveMessage);
        io.to(currentRoom).emit("message", leaveMessage);
      }
      console.log(`${socket.username} disconnected from ${currentRoom}`);
    }
  });

  socket.on("add user", ({ username, room, password }) => {
    if (addedUser && currentRoom && currentRoom !== room) {
      validatePassword(room, password, (isValid) => {
        if (isValid) {
          switchRoom(socket, { room, username });
        } else {
          socket.emit("password incorrect");
          console.log(`Password incorrect for room: ${room}`);
        }
      });
    } else {
      validatePassword(room, password, (isValid) => {
        if (isValid) {
          joinRoom(socket, { room, username, password });
        } else {
          socket.emit("password incorrect");
          console.log(`Password incorrect for room: ${room}`);
        }
      });
    }
  });

  function switchRoom(socket, { room, username }) {
    if (currentRoom) {
      const oldRoom = rooms.get(currentRoom);
      if (oldRoom) {
        socket.leave(currentRoom);
        oldRoom.removeUser(socket.id);
        io.to(currentRoom).emit("update user list", oldRoom.getUsers());
        const leaveMessage = {
          systemMessage: true,
          message: `${socket.username} left the chat`,
        };
        oldRoom.addMessage(leaveMessage);
        io.to(currentRoom).emit("message", leaveMessage);
        console.log(`${socket.username} left room: ${currentRoom}`);
      }
    }

    joinRoom(socket, { room, username });
  }

  function validatePassword(room, password, callback) {
    const chatRoom = rooms.get(room);
    if (!chatRoom || !chatRoom.password || chatRoom.password === password) {
      callback(true);
    } else {
      callback(false);
    }
  }

  function joinRoom(socket, { username, room, password }) {
    socket.username = username;

    if (!rooms.has(room)) {
      rooms.set(room, new ChatRoom(password));
      console.log(`Room created: ${room} with password: ${password || "none"}`);
    }

    const chatRoom = rooms.get(room);
    addedUser = true;
    currentRoom = room;
    chatRoom.addUser(socket.id, username);
    socket.join(room);

    io.to(room).emit("update user list", chatRoom.getUsers());
    io.emit("update room list", Array.from(rooms.keys()));

    // Send existing messages to the new user
    socket.emit("load messages", chatRoom.messages);

    socket.emit("user joined", { username: socket.username, room: room });
    const joinMessage = {
      systemMessage: true,
      message: `${socket.username} joined the chat`,
    };
    chatRoom.addMessage(joinMessage);
    io.to(room).emit("message", joinMessage);

    console.log(`${socket.username} joined room: ${room}`);

    // Save rooms after changes
    saveRooms().catch((err) => console.error("Failed to save rooms:", err));
  }

  socket.on("sendMessage", (data) => {
    if (!addedUser || !currentRoom) return;

    const room = rooms.get(currentRoom);
    if (!room) return;

    const messageData = {
      username: socket.username,
      message: data.message,
      timestamp: new Date().toISOString(),
    };
    room.addMessage(messageData);
    io.to(currentRoom).emit("message", messageData);
    console.log(`Message from ${socket.username} in room ${currentRoom}: ${data.message}`);

    // Save rooms after new message
    saveRooms().catch((err) => console.error("Failed to save rooms:", err));
  });

  socket.on("get room info", (roomName, callback) => {
    const room = rooms.get(roomName);
    if (room) {
      callback({ passwordRequired: !!room.password });
    } else {
      callback({ passwordRequired: false });
    }
  });

  // Keep-alive functionality
  function startKeepAlive() {
    setInterval(
      function () {
        var options = {
          host: "webchat.ammaar.xyz",
          port: 80,
          path: "/",
        };
        http
          .get(options, function (res) {
            res.on("data", function (chunk) {
              try {
                console.log("HEROKU RESPONSE: " + chunk);
              } catch (err) {
                console.log(err.message);
              }
            });
          })
          .on("error", function (err) {
            console.log("Error: " + err.message);
          });
      },
      20 * 60 * 1000, // load every 20 minutes
    );
  }
  startKeepAlive();
});

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
