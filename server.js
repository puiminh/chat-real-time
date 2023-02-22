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

const getUserFromSystemAPI = 'https://api-admin-dype.onrender.com/api/user'
var token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGx0Y3QuY29tIiwiaWF0IjoxNjc1OTEzOTEwLCJleHAiOjE2NzU5NTcxMTB9.-9QomL8YnHvhR30RnFGgYt40OkzRbzFwBRvFHIFvjCY'
const config = {
  headers: { Authorization: `Bearer ${token}` }
};

const baseURL = 'https://chatrealtimebackend.up.railway.app';
const RoomURL = `${baseURL}/rooms`;
const MessageURL = `${baseURL}/messages`;;

const adminID = 0; //Mac dinh admin co id=0

// Global variables to hold all name and rooms created
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

const getUserFromSystem = async (id_user) => {
  try {
    const response = await axios.get(`${getUserFromSystemAPI}/${id_user}`,config)
    console.log(response.data)
    return response.data;
  } catch (error) {
    console.error('Can\'t get data from api system', error.status);
  }
}
const getAllUserFromSystem = async () => {
  try {
    const response = await axios.get(`${getUserFromSystemAPI}`,config)
    console.log(response.data)
    return response.data;
  } catch (error) {
    console.error('Can\'t get data from api system', error.status);
  }
}

const asyncData = async () => {
  await getAllUserFromSystem().then(async (res)=> {
    try {
      const response = await axios.post(`${baseURL}/syncData`,res
      )
      console.log(response);
      return response;
    } catch (error) {
      console.error('async data', error);
    }
  })
}

const getAllMessageF = async (id_room) => {
  try {
    const response = await axios.get(MessageURL);
    return response.data
  } catch (error) {
    // Handle errors
  }
}

function asyncDataExcute() {
  asyncData().then((res)=> {
    axios.get(RoomURL)
    .then(function (response) {
      rooms = response.data
    })
    .catch(function (error) {
      console.log(error);
    });
  })  
}

function getAllRoomsExcute() {
  console.log("Get all room...", RoomURL);
  axios.get(RoomURL)
    .then(function (response) {
      rooms = response.data
      console.log(rooms);
    })
    .catch(function (error) {
      console.log(error);
    });
}

getAllRoomsExcute();

/* ------------- SOCKET---------------- */

io.on("connection", function (socket) {
  console.log(`User connected to server.`,socket.id);
    socket.on("userConnect", function (id_user) {
      const found = rooms.findIndex((e)=>e.id == id_user); //found
    
      if (found != -1) { //OLD USER
  
        console.log(`User ${rooms[found].name} has been in data-chat with id: ${rooms[found].id}.`);
  
        socket.name = rooms[found].name;
        socket.id_user = rooms[found].id;
        socket.currentRoom = rooms[found].id +'';
        socket.join(rooms[found].id +'');
  
      } else { //NEW USER => CREATE
        io.sockets.to(socket.currentRoom+'').emit("NO_USER_FOUND", id_user);
      }
  
        socket.broadcast.emit("online",socket.currentRoom);
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

  socket.on("syncData", function() {

    asyncData().then((res)=> {
      axios.get(RoomURL)
      .then(function (response) {
        rooms = response.data
        socket.emit("syncDataDone");
        socket.emit("updateRooms", rooms, null)
      })
      .catch(function (error) {
        console.log(error);
      });
    })  
  })

  socket.on("adminConnect", function() {
    setUpRoom().then((res)=>{
      rooms = res;
      io.sockets.emit("updateRooms", rooms, null); //update list room (For app) //update list room (For app)
    });
  })

  socket.on("getMessageRoom", function (id_room) {
    getAllMessage(id_room).then((res)=>{
      socket.emit("returnMessageRoom", res);
    })
  })

  socket.on("sendMessage", function (data) {
    sendMessage({id_room: parseInt(socket.currentRoom), id_user: data.sender, message: data.message}).then((res)=>{
      console.log("sendMessage socket: ",data," - ","id_room:", parseInt(socket.currentRoom), "id_user:", data.sender, "message:", data.message, "res: ",res);
    });
    io.sockets.to(socket.currentRoom+'').emit("updateChat", socket.id_user, "chat", data.message);
    socket.broadcast.emit("newMess",socket.currentRoom);
    roomNewMessStatus({id: socket.currentRoom, status: 1})
  });

  socket.on("updateRooms", function (room) {
    console.log("Join rooms: ",room,"from: ",socket.currentRoom);
    socket.leave(socket.currentRoom+'');
    socket.currentRoom = room+'';
    socket.join(room+'');

    //SEEN all the mess

    roomNewMessStatus({id: room, status: -1});
    getAllMessage(room).then((res)=>{
      socket.emit("returnMessageRoom",res);
    })
  });

  socket.on("disconnect", function () {
    console.log(`User ${socket.name} disconnected from server.`);

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