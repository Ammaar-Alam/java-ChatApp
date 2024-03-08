const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// serve static files from the directory where index.html is located
app.use(express.static(path.join(__dirname, "..")));

io.on("connection", (socket) => {
  console.log("New client connected");
  let addedUser = false;

  socket.on("disconnect", () => {
    if (addedUser) {
      // broadcast a user left notification
      socket.broadcast.emit("user left", socket.username);
    }
    console.log("Client disconnected");
  });

  socket.on("add user", (username) => {
    if (addedUser) return;

    // store the username in the socket session
    socket.username = username;
    addedUser = true;
    socket.broadcast.emit("user joined", { username: socket.username });
  });

  socket.on("sendMessage", (data) => {
    // broadcast message to all clients
    io.emit("message", {
      username: socket.username || "Anonymous",
      message: data.message,
    });

    socket.on("user joined", (data) => {
      // Update user list
      updateUserList(data.users);
    });

    socket.on("user left", (data) => {
      // Update user list
      updateUserList(data.users);
    });

    function updateUserList(users) {
      const userListElement = document.getElementById("userList");
      userListElement.innerHTML = ""; // Clear current list
      users.forEach((user) => {
        const userElement = document.createElement("li");
        userElement.textContent = user;
        userListElement.appendChild(userElement);
      });
    }
  });
});

const PORT = process.env.PORT || 3120;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
