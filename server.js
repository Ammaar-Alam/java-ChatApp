const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname)));

let rooms = {}; // stores room details including users, passwords, and messages

io.on("connection", (socket) => {
  socket.emit("update room list", Object.keys(rooms));
  const allUsers = Object.values(rooms).flatMap((room) => Object.values(room.users));
  socket.emit("update user list", allUsers);
  console.log("New client connected");

  let addedUser = false;
  let currentRoom = "";

  socket.on("disconnect", () => {
    if (addedUser && currentRoom) {
      if (rooms[currentRoom]) {
        delete rooms[currentRoom].users[socket.id];
        io.in(currentRoom).emit("update user list", Object.values(rooms[currentRoom].users));
        io.in(currentRoom).emit("message", {
          systemMessage: true,
          message: `${socket.username} left the chat`,
        });
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
      socket.leave(currentRoom);
      delete rooms[currentRoom].users[socket.id];
      io.in(currentRoom).emit("update user list", Object.values(rooms[currentRoom].users));
      io.in(currentRoom).emit("message", {
        systemMessage: true,
        message: `${socket.username} left the chat`,
      });
      console.log(`${socket.username} left room: ${currentRoom}`);
    }

    joinRoom(socket, { room, username });
  }

  function validatePassword(room, password, callback) {
    if (!rooms[room] || !rooms[room].password || rooms[room].password === password) {
      callback(true);
    } else {
      callback(false);
    }
  }

  function joinRoom(socket, { username, room, password }) {
    socket.username = username;

    if (!rooms[room]) {
      rooms[room] = { password: password || null, users: {}, messages: [] };
      console.log(`Room created: ${room} with password: ${password || "none"}`);
    }

    addedUser = true;
    currentRoom = room;
    rooms[room].users[socket.id] = username;
    socket.join(room);

    const usersInRoom = Object.values(rooms[room].users);
    io.in(room).emit("update user list", usersInRoom);
    io.emit("update room list", Object.keys(rooms));

    // Send existing messages to the new user
    socket.emit("load messages", rooms[room].messages);

    socket.emit("user joined", { username: socket.username, room: room });
    const joinMessage = {
      systemMessage: true,
      message: `${socket.username} joined the chat`,
    };
    rooms[room].messages.push(joinMessage);
    io.in(room).emit("message", joinMessage);

    console.log(`${socket.username} joined room: ${room}`);
  }

  socket.on("sendMessage", (data) => {
    if (!addedUser || !currentRoom) return;
    const messageData = {
      username: socket.username,
      message: data.message,
      timestamp: new Date().toISOString(),
    };
    rooms[currentRoom].messages.push(messageData);
    io.in(currentRoom).emit("message", messageData);
    console.log(`Message from ${socket.username} in room ${currentRoom}: ${data.message}`);
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
