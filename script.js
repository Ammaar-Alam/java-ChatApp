const messageList = document.getElementById("messageList");
const usersList = document.getElementById("users");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");

const socket = new WebSocket("ws://localhost:12345");

socket.onopen = function (e) {
  console.log("Connection established");
};

socket.onmessage = function (event) {
  const message = JSON.parse(event.data);

  if (message.type === "message") {
    const msgElement = document.createElement("li");
    msgElement.textContent = `${message.author}: ${message.content}`;
    messageList.appendChild(msgElement);
  } else if (message.type === "userList") {
    usersList.innerHTML = "";
    message.users.forEach((user) => {
      const userElement = document.createElement("li");
      userElement.textContent = user;
      usersList.appendChild(userElement);
    });
  }
};

socket.onerror = function (error) {
  console.error(`WebSocket error: ${error.message}`);
};

messageForm.onsubmit = function (e) {
  e.preventDefault();
  const message = messageInput.value;
  socket.send(JSON.stringify({ content: message }));
  messageInput.value = "";
};

// add all additional JS logic for handling user events, reconnections, disconnections, etc.
