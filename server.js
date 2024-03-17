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
      }

      io.in(currentRoom).emit("user left", {
        username: socket.username,
        room: currentRoom,
      });

      console.log(`${socket.username} disconnected from ${currentRoom}`);
    }
  });

  socket.on("add user", ({ username, room, password }) => {
    if (addedUser) return;

    socket.username = username;
    addedUser = true;
    currentRoom = room;

    if (!rooms[room]) {
      rooms[room] = { password: password || null, users: {} };
    } else if (rooms[room].password !== password) {
      socket.emit("password incorrect");
      return;
    }

    rooms[room].users[socket.id] = username;
    socket.join(room);

    io.in(room).emit("update user list", Object.values(rooms[room].users));
    io.emit("update room list", Object.keys(rooms)); // Update all clients with the new room list

    socket.emit("user joined", { username: socket.username, room: room });
  });

  socket.on("sendMessage", (data) => {
    if (!addedUser || !currentRoom) return;
    io.in(currentRoom).emit("message", {
      username: socket.username,
      message: data.message,
    });
  });
});

const PORT = process.env.PORT || 1170;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
