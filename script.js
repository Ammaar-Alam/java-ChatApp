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

  // initialize socket connection
  function initSocket() {
    if (socket) {
      socket.disconnect(); // disconnect existing socket if any
    }
    socket = io();

    socket.on("message", (data) => {
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
      messages.scrollTop = messages.scrollHeight; // scroll to latest message
    });

    socket.on("update user list", (usernames) => {
      const usersList = document.getElementById("users");
      usersList.innerHTML = ""; // clear existing user list
      usernames.forEach((user) => {
        const userItem = document.createElement("li");
        const usernameSpan = createUsernameSpan(user);
        userItem.appendChild(usernameSpan);
        usersList.appendChild(userItem);
      });
    });

    socket.on("update room list", (rooms) => {
      const roomsList = document.getElementById("rooms");
      roomsList.innerHTML = ""; // clear existing room list
      rooms.forEach((roomName) => {
        const roomItem = document.createElement("li");
        roomItem.textContent = roomName;
        if (roomName === currentRoom) {
          roomItem.classList.add("current-room"); // highlight current room
        }
        roomsList.appendChild(roomItem);
      });
    });

    socket.on("password incorrect", () => {
      alert("Password incorrect. Please try again.");
      resetChatState(); // reset state on incorrect password
    });

    socket.on("connect", () => {
      console.log("Connected to server");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
    });
  }

  // generate a random color for username
  function getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  // create a span element for the username with a unique color
  function createUsernameSpan(username) {
    if (!userColors.has(username)) {
      userColors.set(username, getRandomColor());
    }
    const usernameSpan = document.createElement("span");
    usernameSpan.textContent = username;
    usernameSpan.style.color = userColors.get(username);
    return usernameSpan;
  }

  // reset chat state and reinitialize socket connection
  function resetChatState() {
    messages.innerHTML = ""; // clear messages
    const usersList = document.getElementById("users");
    usersList.innerHTML = ""; // clear user list
    chatContainer.style.display = "none"; // hide chat container
    loginForm.style.display = "flex"; // show login form
    currentRoom = ""; // reset current room
    username = ""; // reset username
    initSocket(); // reinitialize socket connection
  }

  // handle pressing Enter to submit the form
  usernameInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      joinButton.click();
    }
  });

  // handle login form submission
  loginForm.onsubmit = function (e) {
    e.preventDefault();
    username = usernameInput.value.trim();
    const room = roomInput.value.trim();
    const password = passwordInput.value;
    if (username && room) {
      socket.emit("add user", { username, room, password });
      currentRoom = room; // keep track of the current room
      chatContainer.style.display = "grid"; // show chat container
      loginForm.style.display = "none"; // hide login form
      input.focus(); // focus on the message input
    }
  };

  // handle chat message form submission
  form.onsubmit = function (e) {
    e.preventDefault();
    if (input.value.trim()) {
      socket.emit("sendMessage", {
        username: username,
        message: input.value,
        room: currentRoom,
      });
      input.value = ""; // clear the input field
    }
  };

  initSocket(); // initialize the socket connection
});
