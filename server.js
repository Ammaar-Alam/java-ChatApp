const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname)));

let rooms = {}; // Stores room details including users and passwords

io.on("connection", (socket) => {
  socket.emit("update room list", Object.keys(rooms));
  // Emit the current list of all users across rooms upon new client connection
  const allUsers = Object.values(rooms).flatMap((room) => Object.values(room.users));
  socket.emit("update user list", allUsers);
  console.log("New client connected");

  let addedUser = false;
  let currentRoom = "";

  socket.on("disconnect", () => {
    if (addedUser && currentRoom) {
      // Remove user from room
      if (rooms[currentRoom]) {
        delete rooms[currentRoom].users[socket.id];
        io.in(currentRoom).emit(
          "update user list",
          Object.values(rooms[currentRoom].users),
        );
        io.in(currentRoom).emit("message", {
          systemMessage: true,
          message: `${socket.username} left the chat`,
        });
      }
      console.log(`${socket.username} disconnected from ${currentRoom}`);
    }
  });

  socket.on("add user", ({ username, room, password }) => {
    if (addedUser && currentRoom) {
      // Leave the current room
      socket.leave(currentRoom);
      delete rooms[currentRoom].users[socket.id];
      io.in(currentRoom).emit(
        "update user list",
        Object.values(rooms[currentRoom].users),
      );
      io.in(currentRoom).emit("message", {
        systemMessage: true,
        message: `${socket.username} left the chat`,
      });
      console.log(`${socket.username} left room: ${currentRoom}`);
    }

    socket.username = username;

    if (!rooms[room]) {
      rooms[room] = { password: password || null, users: {} };
      console.log(`Room created: ${room} with password: ${password || "none"}`);
    } else if (rooms[room].password && rooms[room].password !== password) {
      socket.emit("password incorrect");
      return;
    }

    addedUser = true;
    currentRoom = room;
    rooms[room].users[socket.id] = username;
    socket.join(room);

    // After adding user to the room, emit the user list for that room
    const usersInRoom = Object.values(rooms[room].users);
    io.in(room).emit("update user list", usersInRoom);
    io.emit("update room list", Object.keys(rooms)); // Update all clients with the new room list

    socket.emit("user joined", { username: socket.username, room: room });
    io.in(room).emit("message", {
      systemMessage: true,
      message: `${socket.username} joined the chat`,
    });

    console.log(`${socket.username} joined room: ${room}`);
  });

  socket.on("sendMessage", (data) => {
    if (!addedUser || !currentRoom) return;
    io.in(currentRoom).emit("message", {
      username: socket.username,
      message: data.message,
    });
    console.log(
      `Message from ${socket.username} in room ${currentRoom}: ${data.message}`,
    );
  });

  socket.on("get room info", (roomName, callback) => {
    if (rooms[roomName]) {
      callback({ passwordRequired: !!rooms[roomName].password });
    } else {
      callback({ passwordRequired: false });
    }
  });
});

const PORT = process.env.PORT || 1170;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
