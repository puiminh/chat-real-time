const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const axios = require("axios");

app.use(express.static("public"));

// Global variables to hold all name and rooms created
var userInfos = {};
var rooms = [
  { name: "global", creator: "Anonymous" },
  { name: "chess", creator: "Anonymous" }
];

io.on("connection", function (socket) {
  console.log(`User connected to server.`);

    socket.on("createUser", function (userInfo) {
    socket.name = userInfo.name;
    socket.id_user = userInfo.id_user;
    userInfos[userInfo.id_user] = userInfo;
    socket.currentRoom = "global";
    socket.join("global");
    console.log(socket.rooms);

    console.log(`User ${userInfo.name} created on server successfully.`);

    socket.emit("updateChat", "INFO", `You have joined ${socket.currentRoom} room`);
    socket.broadcast
      .to("global")
      .emit("updateChat", "INFO", userInfo.name + ` has joined  ${socket.currentRoom} room`);
    io.sockets.emit("updateUsers", userInfos);
    socket.emit("updateRooms", rooms, "global");
  });

  socket.on("sendMessage", function (data) {
    io.sockets.to(socket.currentRoom).emit("updateChat", socket.name, data);
    console.log("sendMessage socket: ",data," - ",socket.name,": ",socket.currentRoom);
  });

  socket.on("createRoom", function (room) {
    if (room != null) {
      rooms.push({ name: room, creator: socket.name });
      io.sockets.emit("updateRooms", rooms);
    }
  });

  socket.on("updateRooms", function (room) {
    console.log("Join rooms: ",room);
    socket.broadcast
      .to(socket.currentRoom)
      .emit("updateChat", "INFO", socket.name + " left room");
    socket.leave(socket.currentRoom);
    socket.currentRoom = room;
    socket.join(room.toString());
    console.log(socket.rooms);
    socket.emit("updateChat", "INFO", "You have joined " + room + " room");
    socket.broadcast
      .to(room)
      .emit(
        "updateChat",
        "INFO",
        socket.name + " has joined " + room + " room"
      );
  });

  socket.on("disconnect", function () {
    console.log(`User ${socket.name} disconnected from server.`);
    delete userInfos[socket.id_user];
    io.sockets.emit("updateUsers", userInfos);
    socket.broadcast.emit(
      "updateChat",
      "INFO",
      socket.name + " has disconnected"
    );
  });
});

server.listen(5000, function () {
  console.log("Listening to port 5000.");
});
