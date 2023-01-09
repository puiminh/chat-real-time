const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bp = require('body-parser')
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const axios = require("axios");
const { response } = require("express");
app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))
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
  res.header('Access-Control-Allow-Origin', 'https://5000-puiminh-chatrealtime-76faaa8tus5.ws-us81.gitpod.io')
  res.header('Access-Control-Allow-Headers', '*')
  // console.log(res);
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




const setUpRoom = async () => {
  try {
    const response = await axios.get('http://localhost:3000/rooms');
    console.log("room getting: ", response.data);
    return response.data
  } catch (error) {
    // Handle errors
  }
}

serialize = function(obj) {
  var str = [];
  for (var p in obj)
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    }
  return str.join("&");
}

const getAllRoom = async (params) => {
  let query = serialize(params)
  console.log(query);

  try {
    const response = await axios.get(`http://localhost:3000/rooms?${query}`);
    console.log(`http://localhost:3000/rooms?${query}`);
    return response.data
  } catch (error) {
    
  }
}

const getRoom = async (id) => {
  try {
    const response = await axios.get(`http://localhost:3000/rooms/${id}`);
    console.log(`http://localhost:3000/rooms/${id}`);
    return response.data
  } catch (error) {
    
  }
}

axios.get('http://localhost:3000/rooms')
  .then(function (response) {
    rooms = response.data
  })
  .catch(function (error) {
    console.log(error);
  });
const createRoom = async (data) => {
  try {
    const response = await axios.post(
      "http://localhost:3000/rooms", {
        name: data.name,
        id: parseInt(data.id),
        newMess: false,
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

const roomNewMessStatus = async (data) => { //actually seen all message of a room
  console.log("putting...",`http://localhost:3000/rooms/${data.id}`,data);
  try {
    const response = await axios.put(
      `http://localhost:3000/rooms/${data.id}`,{
        newMess: data.status,
        name: data.name
      }
    )
    console.log(response.data);    
    return response.data;
  } catch (error) {
    console.log(error)
  }
}

const getAllMessage = async (id_room) => {
  try {
    const response = await axios.get(`http://localhost:3000/messages?id_room=${id_room}`);
    return response.data
  } catch (error) {
    // Handle errors
  }
}

const getAllMessageF = async (id_room) => {
  try {
    const response = await axios.get(`http://localhost:3000/messages`);
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

      setUpRoom().then((res)=>{
        rooms = res;
        console.log("Room emit sending: ", rooms);
        io.sockets.emit("updateRooms", rooms, null); //update list room (For app) //update list room (For app)
      });



      
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

      // socket.emit("updateChat",-1, "INFO", `You have joined ${socket.currentRoom} room`); //event cho ban than
      socket.broadcast.emit("online",socket.currentRoom);

      // socket.broadcast
      //   .to("global")
      //   .emit("updateChat", -1,"INFO", userInfo.name + ` has joined  ${socket.currentRoom} room`); //event cho moi nguoi

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
        socket.broadcast.emit("nowConnectingUser", connectingSocket);
        console.log(connectingSocket);
      });
  });

  socket.on("getMessageRoom", function (id_room) {
    getAllMessage(id_room).then((res)=>{
      socket.emit("returnMessageRoom", res);
    })
  })

  socket.on("sendMessage", function (data) {
    sendMessage({id_room: parseInt(socket.currentRoom), id_user: socket.id_user, message: data, name: socket.name}).then((res)=>{
      console.log("res from socket emit part: ",res.status);
    });
    io.sockets.to(socket.currentRoom+'').emit("updateChat", socket.id_user, socket.name, data);
    socket.broadcast.emit("newMess",socket.currentRoom);

    roomNewMessStatus({id: socket.currentRoom, status: true, name: socket.name})

    console.log("sendMessage socket: ",data," - ",socket.name,socket.id_user,": ",socket.currentRoom,"socket rooms: ",socket.rooms);

  });

  socket.on("updateRooms", function (room, name) {
    console.log("Join rooms: ",room,"from: ",socket.currentRoom);
    socket.leave(socket.currentRoom+'');
    socket.currentRoom = room+'';
    socket.join(room+'');

    //SEEN all the mess

    roomNewMessStatus({id: room, status: false, name: name});
    
    // socket.emit("updateChat", -1,"INFO", "You have joined " + room + " room");
    getAllMessage(room).then((res)=>{
      socket.emit("returnMessageRoom",res);
    })
    // socket.broadcast
    //   .to(room+'')
    //   .emit(
    //     "updateChat",
    //     -1,
    //     "INFO",
    //     socket.name + " has joined " + room + " room"
    //   );
  });

  socket.on("disconnect", function () {
    console.log(`User ${socket.name} disconnected from server.`);
    delete userInfos[socket.id_user];
    // socket.broadcast.emit(
    //   "updateChat",
    //   -1,
    //   "INFO",
    //   socket.name + " has disconnected"
    // );

    socket.broadcast.emit("offline",socket.currentRoom);
  });
});

server.listen(5000, function () {
  console.log("Listening to port 5000.");
});

app.get('/rooms', (req, res) => {

  let seen = req.query;
  console.log(seen);
  getAllRoom(seen).then((res2)=>{
    res.send(res2)
  })
  // if (seen=='yes') {

  //   let seenRoom = db.rooms.filter((e)=>e.newMess)    

  //   console.log(seenRoom);
  //   res.send(seenRoom)
  // } else if (seen=='no') {
  //   let seenRoom = db.rooms.filter((e)=>!e.newMess)
  //   console.log(seenRoom);
  //   res.send(seenRoom)
  // } else {
  //   res.send(db.rooms)
  // }
})

app.get('/messages', (req, res) => {
  getAllMessageF().then((res2)=>{
    res.send(res2)
  })
})

app.get('/rooms/:id', (req, res) => {

  console.log(req.params['id']); 
  let id = req.params['id'];
  getRoom(id).then((res2)=>{
    res.send(res2);
  })
})


app.post('/rooms/:id', (req, res) => {
  console.log(req.params['id']); 
  let id_room = req.params['id'];
  let id_user = req.body['id_user'];
  let data = req.body['message'];
  let name = req.body['name'];
   sendMessage({id_room: id_room, id_user: id_user, message: data, name: name}).then((response)=>{
    res.send(response);
   })
})

app.post('/rooms', (req, res) => {
  console.log(req.body);
  let id_user = req.body.id_user;
  let name = req.body.name;
  createRoom({ name: name, id: id_user }).then((response)=>{
    res.send(response);
   })
})

// createRoom({ name: userInfo.name, id: userInfo.id_user })