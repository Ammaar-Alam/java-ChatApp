document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const loginForm = document.getElementById("loginForm");
  const chatContainer = document.querySelector(".chat-container");
  const messages = document.getElementById("messages");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const usernameInput = document.getElementById("usernameInput");
  const joinButton = loginForm.querySelector('button[type="submit"]');

  let username = "";

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

    // If it's a system message, apply the special class
    if (data.systemMessage) {
      item.classList.add("system-message");
    } else {
      // Apply other conditions based on the username
      item.classList.add(
        data.username === username ? "msg-from-me" : "msg-from-others",
      );
      item.textContent = `${data.username}: ${data.message}`;
    }

    // For system messages, use only the message without the username
    if (data.systemMessage) {
      item.textContent = data.message;
    } else {
      item.textContent = `${data.username}: ${data.message}`;
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
      userItem.textContent = data.username;
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
