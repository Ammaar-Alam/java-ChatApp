document.addEventListener("DOMContentLoaded", () => {
  let socket;
  const loginForm = document.getElementById("loginForm");
  const chatContainer = document.querySelector(".chat-container");
  const messages = document.getElementById("messages");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const usernameInput = document.getElementById("usernameInput");
  const roomInput = document.getElementById("roomInput");
  const passwordInput = document.getElementById("passwordInput");
  const joinButton = loginForm.querySelector('button[type="submit"]');
  const userColors = new Map();
  let currentRoom = "";
  let username = "";

  function initSocket() {
    if (socket) {
      socket.disconnect();
    }
    socket = io();

    socket.on("message", (data) => {
      const item = document.createElement("li");
      if (data.systemMessage) {
        // System message handling remains unchanged
      } else {
        const usernameSpan = createUsernameSpan(data.username);
        item.appendChild(usernameSpan);
        item.append(`: ${data.message}`);
      }
      messages.appendChild(item);
      messages.scrollTop = messages.scrollHeight;
    });

    socket.on("update user list", (usernames) => {
      const usersList = document.getElementById("users");
      usersList.innerHTML = "";
      usernames.forEach((user) => {
        const userItem = document.createElement("li");
        const usernameSpan = createUsernameSpan(user);
        userItem.appendChild(usernameSpan);
        usersList.appendChild(userItem);
      });
    });

    socket.on("update room list", (rooms) => {
      const roomsList = document.getElementById("rooms");
      roomsList.innerHTML = "";
      rooms.forEach((roomName) => {
        const roomItem = document.createElement("li");
        roomItem.textContent = roomName;
        if (roomName === currentRoom) {
          roomItem.classList.add("current-room");
        }
        roomsList.appendChild(roomItem);
      });
    });

    socket.on("password incorrect", () => {
      alert("Password incorrect. Please try again.");
      resetChatState();
    });

    socket.on("connect", () => {
      console.log("Connected to server");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
    });
  }

  function getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  function createUsernameSpan(username) {
    if (!userColors.has(username)) {
      userColors.set(username, getRandomColor());
    }
    const usernameSpan = document.createElement("span");
    usernameSpan.textContent = username;
    usernameSpan.style.color = userColors.get(username);
    return usernameSpan;
  }

  function resetChatState() {
    messages.innerHTML = "";
    const usersList = document.getElementById("users");
    usersList.innerHTML = "";
    chatContainer.style.display = "none";
    loginForm.style.display = "flex";
    currentRoom = "";
    username = "";
    initSocket();
  }

  usernameInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      joinButton.click();
    }
  });

  loginForm.onsubmit = function (e) {
    e.preventDefault();
    username = usernameInput.value.trim();
    const room = roomInput.value.trim();
    const password = passwordInput.value;
    if (username && room) {
      socket.emit("add user", { username, room, password });
      currentRoom = room;
      chatContainer.style.display = "grid";
      loginForm.style.display = "none";
      input.focus();
    }
  };

  form.onsubmit = function (e) {
    e.preventDefault();
    if (input.value.trim()) {
      socket.emit("sendMessage", {
        username: username,
        message: input.value,
        room: currentRoom,
      });
      input.value = "";
    }
  };

  initSocket(); // Initialize the socket connection
});
