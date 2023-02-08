const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bp = require('body-parser')
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const path = require('path');

const axios = require("axios");
const { response } = require("express");
app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))
app.use(express.static("public"));


const baseURL = 'https://chatrealtimebackend-production.up.railway.app';
const RoomURL = `${baseURL}/rooms`;
const MessageURL = `${baseURL}/messages`;;

const adminID = 0; //Mac dinh admin co id=0

// Global variables to hold all name and rooms created
var userInfos = {};
var rooms = [
];




const setUpRoom = async () => {
  try {
    const response = await axios.get(RoomURL);
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
    const response = await axios.get(`${RoomURL}?${query}`);
    console.log(`${RoomURL}?${query}`);
    return response.data
  } catch (error) {
    
  }
}

const getRoom = async (id) => {
  try {
    const response = await axios.get(`${RoomURL}/${id}`);
    console.log(`${RoomURL}/${id}`);
    return response.data
  } catch (error) {
    
  }
}

axios.get(RoomURL)
  .then(function (response) {
    rooms = response.data
  })
  .catch(function (error) {
    console.log(error);
  });
const createRoom = async (data) => {
  try {
    const response = await axios.post(
      RoomURL, {
        name: data.name,
        newMess: 0,
      }
    )
    console.log(response.data)
    return response.data
  } catch (error) {
    console.error(error)
  }
}

const sendMessage = async (data) => {
  console.log("sending...",MessageURL,data);
  try {
    const response = await axios.post(
      MessageURL,{
        sender: data.id_user,
        message: data.message,
        id_room: data.id_room
      }
    )    
    return response.data;
  } catch (error) {
    console.log(error)
  }
}

const roomNewMessStatus = async (data) => { //actually seen all message of a room
  console.log("putting...",`${RoomURL}/${data.id}`,data);
  try {
    const response = await axios.put(
      `${RoomURL}/${data.id}`,{
        new_mess: data.status,
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
    const response = await axios.get(`${MessageURL}?id_room=${id_room}`);
    return response.data
  } catch (error) {
    // Handle errors
  }
}

const getAllMessageF = async (id_room) => {
  try {
    const response = await axios.get(MessageURL);
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

      if (socket.id_user != adminID) { //Not a admin
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
    sendMessage({id_room: parseInt(socket.currentRoom), id_user: socket.id_user, message: data}).then((res)=>{
      console.log("res from socket emit part: ",res.status);
    });
    io.sockets.to(socket.currentRoom+'').emit("updateChat", socket.id_user, "chat", data);
    socket.broadcast.emit("newMess",socket.currentRoom);

    roomNewMessStatus({id: socket.currentRoom, status: 1, name: socket.name})

    console.log("sendMessage socket: ",data," - ",socket.name,socket.id_user,": ",socket.currentRoom,"socket rooms: ",socket.rooms);

  });

  socket.on("updateRooms", function (room, name) {
    console.log("Join rooms: ",room,"from: ",socket.currentRoom);
    socket.leave(socket.currentRoom+'');
    socket.currentRoom = room+'';
    socket.join(room+'');

    //SEEN all the mess

    roomNewMessStatus({id: room, status: -1, name: name});
    
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

app.get('/client/*',(req, res) => {
  res.sendFile(path.join(__dirname, 'public/client.html'));
})

// createRoom({ name: userInfo.name, id: userInfo.id_user })