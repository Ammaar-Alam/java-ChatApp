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
  let targetRoom = ""; // Room user wants to join

  // Generate a random color for username
  function getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  // Create a span element for the username with a unique color
  function createUsernameSpan(username) {
    if (!userColors.has(username)) {
      userColors.set(username, getRandomColor());
    }
    const usernameSpan = document.createElement("span");
    usernameSpan.textContent = username;
    usernameSpan.style.color = userColors.get(username);
    return usernameSpan;
  }

  // Initialize socket connection
  function initSocket() {
    if (socket) {
      socket.disconnect(); // Disconnect existing socket if any
    }
    socket = io();

    // Clear existing event listeners to avoid duplication
    socket.removeAllListeners();

    // Add listeners if not already added
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
        messages.scrollTop = messages.scrollHeight; // Scroll to latest message
      });

      socket.on("update user list", (usernames) => {
        console.log("Updating user list:", usernames);
        const usersList = document.getElementById("users");
        usersList.innerHTML = ""; // Clear existing user list
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
        roomsList.innerHTML = ""; // Clear existing room list
        rooms.forEach((roomName) => {
          const roomItem = document.createElement("li");
          roomItem.textContent = roomName;
          roomItem.classList.add("room-list-item");
          roomItem.addEventListener("click", () => joinRoom(roomName)); // Add click event listener
          if (roomName === currentRoom) {
            roomItem.classList.add("current-room"); // Highlight current room
          }
          roomsList.appendChild(roomItem);
        });
      });

      socket.on("password incorrect", () => {
        alert("Password incorrect. Please try again.");
        // Reset the targetRoom to allow retrying
        targetRoom = "";
      });

      socket.on("connect", () => {
        console.log("Connected to server");
      });

      socket.on("disconnect", () => {
        console.log("Disconnected from server");
      });

      socket.on("user joined", (data) => {
        console.log("User joined:", data);
        currentRoom = data.room; // Update currentRoom on successful join
        highlightCurrentRoom();
      });

      listenersAdded = true; // Mark listeners as added
    }

    form.removeEventListener("submit", handleFormSubmit);
    form.addEventListener("submit", handleFormSubmit);
  }

  // Handle login form submission
  loginForm.onsubmit = function (e) {
    e.preventDefault();
    username = usernameInput.value.trim();
    const room = roomInput.value.trim();
    const password = passwordInput.value;
    console.log("Login form submitted:", { username, room, password });
    if (username && room) {
      socket.emit("add user", { username, room, password });
      currentRoom = room; // Keep track of the current room
      chatContainer.style.display = "grid"; // Show chat container
      loginForm.style.display = "none"; // Hide login form
      input.focus(); // Focus on the message input
      highlightCurrentRoom();
    }
  };

  // Handle chat message form submission
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
      input.value = ""; // Clear the input field
    }
  }

  // Join a room, prompt for password if needed
  function joinRoom(roomName) {
    if (roomName === currentRoom) return;

    targetRoom = roomName;
    console.log("Attempting to join room:", roomName);
    // Simulate getting the room's password requirement from the server
    socket.emit("get room info", roomName, (roomInfo) => {
      if (roomInfo && roomInfo.passwordRequired) {
        // Show the modal
        console.log("Password required for room:", roomName);
        passwordModal.style.display = "block";
        modalPasswordInput.focus();
      } else {
        switchRoom(roomName, null);
      }
    });
  }

  // Switch room
  function switchRoom(roomName, password) {
    console.log("Switching room:", { roomName, password });
    socket.emit("add user", { username, room: roomName, password });
    // Only update currentRoom if the password is correct
    socket.once("user joined", (data) => {
      currentRoom = data.room; // Keep track of the current room
      chatContainer.style.display = "grid"; // Show chat container
      loginForm.style.display = "none"; // Hide login form
      input.focus(); // Focus on the message input
      highlightCurrentRoom();
    });
  }

  // Highlight the current room
  function highlightCurrentRoom() {
    const roomItems = document.querySelectorAll(".room-list-item");
    roomItems.forEach((item) => {
      item.classList.remove("current-room");
      if (item.textContent === currentRoom) {
        item.classList.add("current-room");
      }
    });
  }

  // Modal event listeners
  closeModal.onclick = function () {
    passwordModal.style.display = "none";
  };

  modalSubmit.onclick = function () {
    const password = modalPasswordInput.value;
    console.log("Submitting password for room:", { targetRoom, password });
    passwordModal.style.display = "none";
    modalPasswordInput.value = ""; // Clear the input field
    switchRoom(targetRoom, password);
  };

  // Close the modal if the user clicks outside of it
  window.onclick = function (event) {
    if (event.target == passwordModal) {
      passwordModal.style.display = "none";
    }
  };

  initSocket(); // Initialize the socket connection
});
