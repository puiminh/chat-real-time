const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const axios = require("axios");
const { response } = require("express");

app.use(express.static("public"));


// JSON SERVER
const jsonServer = require('json-server')
const serverDB = jsonServer.create()
const router = jsonServer.router('db.json')
const middlewares = jsonServer.defaults();
const db = require('./db.json');

serverDB.use(middlewares);
serverDB.use(jsonServer.bodyParser);

serverDB.use((req, res, next) => {
  console.log("Get req", req.params, req.body);
  
  res.header('Access-Control-Allow-Origin', 'https://5000-puiminh-chatrealtime-76faaa8tus5.ws-us81.gitpod.io')
  res.header('Access-Control-Allow-Headers', '*')
  console.log(res);
  next()
})


serverDB.use(router)

serverDB.listen(3000, () => {
  console.log('JSON Server is running')
})

// Global variables to hold all name and rooms created
var userInfos = {};
var rooms = [
];

setUpRoom();


// Setup rooms
function setUpRoom() {
  axios.get('http://localhost:3000/rooms')   //GET THE ROOM
  .then(function (response) {
    console.log("data from http://localhost:3000/rooms: ",response.data);
    rooms = response.data
  })
  .catch(function (error) {
    console.log(error);
  })
  // .then(function () {
  // });   
}

const createRoom = async (data) => {
  try {
    const response = await axios.post(
      "http://localhost:3000/rooms", {
        name: data.name,
        id: parseInt(data.id),
        messages: [],
      }
    )
    console.log(response.data)
    return response.data
  } catch (error) {
    console.error(error)
  }
}

const sendMessage = async (data) => {
  console.log("sending...",`http://localhost:3000/messages`,data);
  try {
    const response = await axios.post(
      `http://localhost:3000/messages`,{
        id: Math.round(Date.now() / 1000), 
        name: data.name,
        sender: data.id_user,
        message: data.message,
        id_room: data.id_room
      }
    )    
    return response;
  } catch (error) {
    console.log(error)
  }
}

const getAllMessage = async (id_room) => {
  try {
    const response = await axios.get(`http://localhost:3000/messages?id_room=${id_room}`);

    console.log("data from ",`http://localhost:3000/messages?id_room=${id_room}`,response.data);
    return response.data
  } catch (error) {
    // Handle errors
  }
}

io.on("connection", function (socket) {
  console.log(`User connected to server.`,socket.id);
    socket.on("createUser", function (userInfo) {
    const found = rooms.findIndex((e)=>e.id == userInfo.id_user);
    if (found != -1) { //OLD USER

      console.log(`User ${userInfo.name} has been in data-chat with id: ${rooms[found].id}.`);

      socket.name = rooms[found].name;
      socket.id_user = rooms[found].id;
      userInfos[rooms[found].id] = userInfo;
      socket.currentRoom = rooms[found].id +'';

      socket.join(rooms[found].id +'');
      io.sockets.emit("updateRooms", rooms, null); //update list room (For app) //update list room (For app)
      
    } else { //NEW USER => CREATE
      socket.name = userInfo.name;
      socket.id_user = userInfo.id_user;
      userInfos[userInfo.id_user] = userInfo;
  
      socket.currentRoom = userInfo.id_user+'';
      socket.join(userInfo.id_user+'');
  
      console.log(`User ${userInfo.name} - ${userInfo.id_user} created on server successfully.`);
    
      //make a room right way
  
      createRoom({ name: userInfo.name, id: userInfo.id_user }).then((res)=>{
        rooms.push(res);
        console.log("PUSH in to rooms array: ",res," Now:",rooms);
        io.sockets.emit("updateRooms", rooms, null); //update list room (For app) //update list room (For app)
      })
    }

      socket.emit("updateChat",-1, "INFO", `You have joined ${socket.currentRoom} room`); //event cho ban than
      socket.broadcast.emit("online",socket.currentRoom); //event cho ban than

      socket.broadcast
        .to("global")
        .emit("updateChat", -1,"INFO", userInfo.name + ` has joined  ${socket.currentRoom} room`); //event cho moi nguoi

      if (socket.id_user != rooms[0].id) { //Not a admin
        socket.emit("notAdminUser");
      } else { //La admin, gui danh sach nhung nguoi dang online (tim kiem socket)
      }
      
      io.fetchSockets().then((socketsConnect)=>{
        let connectingSocket = socketsConnect.map((e)=>{
          if (e.connected) {
            return e.id_user
          } else {
            return false
          }
        })

        socket.emit("nowConnectingUser", connectingSocket);
        console.log(connectingSocket);
      });
  });

  socket.on("getMessageRoom", function (id_room) {
    getAllMessage(id_room).then((res)=>{
      console.log("Emit ->",socket.id_user ,": ",res);
      socket.emit("returnMessageRoom", res);
    })
  })

  socket.on("sendMessage", function (data) {
    sendMessage({id_room: parseInt(socket.currentRoom), id_user: socket.id_user, message: data, name: socket.name}).then((res)=>{
      console.log("res from socket emit part: ",res.status);
    });
    io.sockets.to(socket.currentRoom+'').emit("updateChat", socket.id_user, socket.name, data);
    console.log("sendMessage socket: ",data," - ",socket.name,socket.id_user,": ",socket.currentRoom,"socket rooms: ",socket.rooms);

  });

  // socket.on("createRoom", function (room) {
  //   if (room != null) {
  //     rooms.push({ name: room });
  //     io.sockets.emit("updateRooms", rooms, null);
  //   }
  // });

  socket.on("updateRooms", function (room) {
    console.log("Join rooms: ",room,"from: ",socket.currentRoom);
    socket.leave(socket.currentRoom+'');
    socket.currentRoom = room+'';
    socket.join(room+'');
    
    socket.emit("updateChat", -1,"INFO", "You have joined " + room + " room");
    getAllMessage(room).then((res)=>{
      socket.emit("returnMessageRoom",res);
    })
    socket.broadcast
      .to(room+'')
      .emit(
        "updateChat",
        -1,
        "INFO",
        socket.name + " has joined " + room + " room"
      );
  });

  socket.on("disconnect", function () {
    console.log(`User ${socket.name} disconnected from server.`);
    delete userInfos[socket.id_user];
    socket.broadcast.emit(
      "updateChat",
      -1,
      "INFO",
      socket.name + " has disconnected"
    );

    socket.broadcast.emit("offline",socket.currentRoom);
  });
});

server.listen(5000, function () {
  console.log("Listening to port 5000.");
});
