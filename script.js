document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
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

  function getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  function getUsernameColor(username) {
    if (!userColors.has(username)) {
      userColors.set(username, getRandomColor());
    }
    return userColors.get(username);
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
      currentRoom = room; // Keep track of the current room
      chatContainer.style.display = "flex";
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
    usersList.innerHTML = ""; // Clear the user list
    usernames.forEach((username) => {
      const li = document.createElement("li");
      const usernameSpan = createUsernameSpan(username); // Reuse this for colorful names
      li.appendChild(usernameSpan);
      usersList.appendChild(li);
    });
  });

  socket.on("update room list", (rooms) => {
    const roomsList = document.getElementById("rooms");
    roomsList.innerHTML = ""; // Clear current list
    rooms.forEach((roomName) => {
      const roomItem = document.createElement("li");
      roomItem.textContent = roomName;
      if (roomName === currentRoom) {
        roomItem.style.textDecoration = "underline"; // Highlight the current room
      }
      roomsList.appendChild(roomItem);
    });
  });

  socket.on("password incorrect", () => {
    alert("Password incorrect. Please try again.");
    roomInput.value = "";
    passwordInput.value = "";
    chatContainer.style.display = "none";
    loginForm.style.display = "block";
  });
});
