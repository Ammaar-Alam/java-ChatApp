const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the directory where index.html is located
app.use(express.static(path.join(__dirname, "..")));

io.on("connection", (socket) => {
  console.log("New client connected");
  let addedUser = false;

  socket.on("disconnect", () => {
    if (addedUser) {
      // Broadcast a user left notification
      socket.broadcast.emit("user left", socket.username);
    }
    console.log("Client disconnected");
  });

  socket.on("add user", (username) => {
    if (addedUser) return;

    // Store the username in the socket session
    socket.username = username;
    addedUser = true;
    socket.broadcast.emit("user joined", { username: socket.username });
  });

  socket.on("sendMessage", (data) => {
    // Broadcast message to all clients
    io.emit("message", {
      username: socket.username || "Anonymous",
      message: data.message,
    });
  });
});

const PORT = process.env.PORT || 1170;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
