document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const input = document.getElementById("input");
  const form = document.getElementById("form");
  const messages = document.getElementById("messages");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value) {
      socket.emit("sendMessage", input.value);
      input.value = "";
    }
  });

  socket.on("message", (message) => {
    const item = document.createElement("li");
    item.textContent = message;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
  });
});
