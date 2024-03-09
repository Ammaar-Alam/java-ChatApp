document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const loginForm = document.getElementById("loginForm");
  const chatContainer = document.querySelector(".chat-container");
  const messages = document.getElementById("messages");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const usernameInput = document.getElementById("usernameInput");
  const joinButton = loginForm.querySelector('button[type="submit"]');
  const userColors = new Map();

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
    const usernameSpan = document.createElement("span");
    usernameSpan.classList.add("username-highlight");
    usernameSpan.textContent = username;
    // Set the color style to be the user's random color
    usernameSpan.style.color = getUsernameColor(username);
    return usernameSpan;
  }
  // Listen for Enter key press to submit the username
  usernameInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      joinButton.click();
    }
  });

  loginForm.onsubmit = function (e) {
    e.preventDefault();
    username = usernameInput.value.trim();
    if (username) {
      socket.emit("add user", username);
      chatContainer.style.display = "flex"; // Show chat window
      loginForm.style.display = "none"; // Hide login
      input.focus(); // Focus the message input
    }
  };

  form.onsubmit = function (e) {
    e.preventDefault();
    if (input.value.trim()) {
      socket.emit("sendMessage", { message: input.value });
      input.value = "";
    }
  };

  socket.on("message", (data) => {
    const item = document.createElement("li");

    if (data.systemMessage) {
      item.classList.add("system-message");
      item.textContent = data.message;
    } else {
      const usernameSpan = createUsernameSpan(data.username);
      usernameSpan.classList.add("username-highlight");
      usernameSpan.textContent = data.username;

      item.classList.add(
        data.username === username ? "msg-from-me" : "msg-from-others",
      );
      item.appendChild(usernameSpan);
      item.append(` : ${data.message}`);
    }

    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  });

  socket.on("user joined", (data) => {
    const existingUsers = Array.from(document.getElementById("users").children).map(
      (userLi) => userLi.textContent,
    );

    if (!existingUsers.includes(data.username)) {
      const userItem = document.createElement("li");
      const usernameSpan = createUsernameSpan(data.username);
      userItem.appendChild(usernameSpan);
      document.getElementById("users").appendChild(userItem);
    }
  });

  socket.on("user left", (username) => {
    const userList = document.getElementById("users");
    const userItems = userList.getElementsByTagName("li");
    for (let item of userItems) {
      if (item.textContent === username) {
        userList.removeChild(item);
        break;
      }
    }
  });
});
