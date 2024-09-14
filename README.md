# Chat Application

This project is a real-time chat application built with Node.js, Express, and Socket.IO. It allows users to join a chat room, send messages, and see other users in the room.

## Live Demo

Experience the live chat without any setup. Join the conversation now on [my website](https://webchat.ammaar.xyz).

*(NOTE: The site is hosted using Heroku dynos, which go to sleep after an hour of inactivity; so the first time loading into the site might take a few seconds.)*

## Features

- Real-time messaging
- Users can enter a username to join the chat
- Displays all users currently in the chat room
- Responsive design for both desktop and mobile devices
- Users can create public chatrooms or create private chatrooms that are password protected

![Chat GUI](https://github.com/Ammaar-Alam/java-ChatApp/blob/main/WebChatGUI.png?raw=true)

## Installation

Prefer to run it locally? Here's how:

1. Clone the repository: `git clone https://github.com/Ammaar-Alam/java-ChatApp`
2. Enter the project: `cd java-Chatapp`
3. Install dependencies: `npm install socket.io express`
4. Launch the server: `npm start`
   - Access at [localhost:1170](http://localhost:1170)

The application will be running on [http://localhost:1170](http://localhost:1170).

## Usage

After starting the server, open a web browser and go to [http://localhost:1170](http://localhost:1170). Enter a username to join the chat room. You can then start sending messages and see other users in the room.

## Contributing

Contributions to improve the chat application are welcome. Please follow these steps to contribute:

1. Fork the repository.
2. Create a new branch: `git checkout -b feature-branch-name`.
3. Make changes and commit them: `git commit -am 'Add some feature'`.
4. Push to the branch: `git push origin feature-branch-name`.
5. Create a new Pull Request.

## License

This project is licensed under the MIT License - see the [license](/LICENSE.md) file for details.


# Test Branch
This branch is used for implementing and testing new features before pulling to the main branch :)

# Testing -> To-Do List
   - ~~Implementing chatroom feature (allowing users to create their own private chatrooms and password protect them)~~
   - ~~Fix user joined/left server message~~
   - ~~Fix CSS before user submits login form~~
   - ~~Fix chat-room div spacing and highlight~~
   - ~~Fix bug after user enters incorrect password (can no longer join rooms even if correct password is inputted)~~
   - ~~Add updated console logs (showing when a room is created in console and displaying its password; showing when a user leaves and joins a room)~~
   - ~~Add ability for users to change their rooms as they please by clicking on any rooms in the available list on the right column~~
   - ~~Fix bug where if a user enters an incorrect password for a room, their messages no long appear client-side in their current room~~
   - Save messages server-side instead of client sisde so they won't disappear on user refresh
