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
  const userColors = new Map();
  let currentRoom = "";
  let username = "";
  let listenersAdded = false;

  const passwordModal = document.getElementById("passwordModal");
  const closeModal = document.getElementById("closeModal");
  const modalPasswordInput = document.getElementById("modalPasswordInput");
  const modalSubmit = document.getElementById("modalSubmit");
  let targetRoom = ""; // room user wants to join

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

  function initSocket() {
    if (socket) {
      socket.disconnect();
    }
    socket = io();

    socket.removeAllListeners();

    if (!listenersAdded) {
      socket.on("message", (data) => {
        console.log("Received message:", data);
        const item = document.createElement("li");
        if (data.systemMessage) {
          item.textContent = data.message;
          item.classList.add("system-message");
        } else {
          const usernameSpan = createUsernameSpan(data.username);
          item.appendChild(usernameSpan);
          item.append(`: ${data.message}`);
        }
        messages.appendChild(item);
        messages.scrollTop = messages.scrollHeight;
      });

      socket.on("update user list", (usernames) => {
        console.log("Updating user list:", usernames);
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
        console.log("Updating room list:", rooms);
        const roomsList = document.getElementById("rooms");
        roomsList.innerHTML = "";
        rooms.forEach((roomName) => {
          const roomItem = document.createElement("li");
          roomItem.textContent = roomName;
          roomItem.classList.add("room-list-item");
          roomItem.addEventListener("click", () => joinRoom(roomName));
          if (roomName === currentRoom) {
            roomItem.classList.add("current-room");
          }
          roomsList.appendChild(roomItem);
        });
      });

      socket.on("password incorrect", () => {
        alert("Password incorrect. Please try again.");
        targetRoom = ""; // reset the targetRoom to allow retrying
        console.log("Password incorrect. Current room:", currentRoom);
        highlightCurrentRoom(); // ensure current room is highlighted
      });

      socket.on("connect", () => {
        console.log("Connected to server");
      });

      socket.on("disconnect", () => {
        console.log("Disconnected from server");
      });

      socket.on("user joined", (data) => {
        console.log("User joined:", data);
        currentRoom = data.room;
        highlightCurrentRoom();
      });

      listenersAdded = true;
    }

    form.removeEventListener("submit", handleFormSubmit);
    form.addEventListener("submit", handleFormSubmit);
  }

  loginForm.onsubmit = function (e) {
    e.preventDefault();
    username = usernameInput.value.trim();
    const room = roomInput.value.trim();
    const password = passwordInput.value;
    console.log("Login form submitted:", { username, room, password });
    if (username && room) {
      socket.emit("add user", { username, room, password });

      // Only update currentRoom and display the chat container if password is correct
      socket.on("user joined", (data) => {
        currentRoom = data.room;
        chatContainer.style.display = "grid";
        loginForm.style.display = "none";
        input.focus();
        highlightCurrentRoom();
      });
    }
  };

  function handleFormSubmit(e) {
    e.preventDefault();
    console.log("Form submitted");
    if (input.value.trim()) {
      const message = input.value;
      console.log("Sending message:", message);
      socket.emit("sendMessage", {
        username: username,
        message: message,
        room: currentRoom,
      });
      input.value = "";
    }
  }

  function joinRoom(roomName) {
    if (roomName === currentRoom) return;

    targetRoom = roomName;
    console.log("Attempting to join room:", roomName);
    socket.emit("get room info", roomName, (roomInfo) => {
      if (roomInfo && roomInfo.passwordRequired) {
        console.log("Password required for room:", roomName);
        passwordModal.style.display = "block";
        modalPasswordInput.focus();
      } else {
        switchRoom(roomName, null);
      }
    });
  }

  function switchRoom(roomName, password) {
    console.log("Switching room:", { roomName, password });
    socket.emit("add user", { username, room: roomName, password });

    // Only update currentRoom and display the chat container if password is correct
    socket.on("user joined", (data) => {
      currentRoom = data.room;
      chatContainer.style.display = "grid";
      loginForm.style.display = "none";
      input.focus();
      highlightCurrentRoom();
    });
  }

  function highlightCurrentRoom() {
    const roomItems = document.querySelectorAll(".room-list-item");
    roomItems.forEach((item) => {
      item.classList.remove("current-room");
      if (item.textContent === currentRoom) {
        item.classList.add("current-room");
      }
    });
  }

  closeModal.onclick = function () {
    passwordModal.style.display = "none";
  };

  modalSubmit.onclick = function () {
    const password = modalPasswordInput.value;
    console.log("Submitting password for room:", { targetRoom, password });
    passwordModal.style.display = "none";
    modalPasswordInput.value = "";
    switchRoom(targetRoom, password);
  };

  window.onclick = function (event) {
    if (event.target == passwordModal) {
      passwordModal.style.display = "none";
    }
  };

  initSocket();
});
