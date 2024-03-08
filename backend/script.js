// Assuming that the server emits 'userList' event with the list of users.
// And 'newMessage' event with the new message information.

document.addEventListener("DOMContentLoaded", () => {
  const socket = io.connect();
  const messageList = document.getElementById("messageList");
  const usersList = document.getElementById("users");
  const messageInput = document.getElementById("messageInput");

  socket.on("userList", (users) => {
    usersList.innerHTML = "";
    users.forEach((user) => {
      const userElement = document.createElement("li");
      userElement.innerText = user;
      usersList.appendChild(userElement);
    });
  });

  socket.on("newMessage", (message) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message-item");
    messageElement.innerText = `${message.sender}: ${message.content}`;
    messageList.appendChild(messageElement);
    messageList.scrollTop = messageList.scrollHeight; // Scroll to the bottom
  });

  document.querySelector(".send-button").addEventListener("click", () => {
    const message = messageInput.value.trim();
    if (message) {
      socket.emit("sendMessage", message);
      messageInput.value = "";
    }
  });

  // Add event listener for message input on Enter key press
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.querySelector(".send-button").click();
    }
  });
});
