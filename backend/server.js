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
      io.emit("user left", socket.username);
      console.log(`${socket.username} disconnected`);
    }
  });

  socket.on("add user", (username) => {
    if (addedUser) return;
    socket.username = username;
    addedUser = true;
    io.emit("user joined", { username: socket.username });
  });

  socket.on("sendMessage", (data) => {
    if (!addedUser) {
      // Assume the username is available but the user hasn't been flagged as added.
      addedUser = true; // Mark the user as added.
      // Check if the username is set; if not, default to "Anonymous"
      socket.username = socket.username || "Anonymous";
      io.emit("user joined", { username: socket.username });
    }
    io.emit("message", {
      username: socket.username,
      message: data.message,
    });
  });
});

const PORT = process.env.PORT || 1170;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
