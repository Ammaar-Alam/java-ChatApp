document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const loginForm = document.getElementById("loginForm");
  const chat = document.getElementById("chat");
  const messages = document.getElementById("messages");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const usernameInput = document.getElementById("usernameInput");

  let username = "";

  loginForm.onsubmit = function (e) {
    e.preventDefault();
    username = usernameInput.value;
    if (username) {
      chat.style.display = "block"; // Show chat window
      loginForm.style.display = "none"; // Hide login
      socket.emit("add user", username);
    }
  };

  form.onsubmit = function (e) {
    e.preventDefault();
    if (input.value) {
      socket.emit("sendMessage", { message: input.value, username: username });
      input.value = "";
    }
  };

  socket.on("message", (data) => {
    const item = document.createElement("li");
    item.classList.add(data.username === username ? "msg-from-me" : "msg-from-others");
    item.innerHTML = `<strong>${data.username}</strong>: ${data.message}`;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
  });
});
