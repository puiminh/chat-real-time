var socket = io();
var userlist = document.getElementById("active_users_list");
var roomlist = document.getElementById("active_rooms_list");
var message = document.getElementById("messageInput");
var sendMessageBtn = document.getElementById("send_message_btn");
var roomInput = document.getElementById("roomInput");
var createRoomBtn = document.getElementById("room_add_icon_holder");
var chatDisplay = document.getElementById("chat");

var currentRoom = "global";
var myUsername = "";
var myUserId;
var hasImg = false;

// axios.defaults.withCredentials = true; //CORS

// function setUpRoom() {
//   axios.get('https://3000-puiminh-chatrealtime-76faaa8tus5.ws-us81.gitpod.io/rooms',  {
//     headers: {
//     }
//    })
//   .then(function (response) {
//     console.log(response);
//   })
//   .catch(function (error) {
//     console.log(error);
//   })
//   .then(function (response) {
//     return response;
//   });   
// }

// setUpRoom();

//Send message func
function sendMsg(msg) {
  if(msg) {
    socket.emit("sendMessage", msg);
    hasImg = false;
  } 
  
  if (message.value) {
    socket.emit("sendMessage", message.value);
    message.value = "";
  }
}

//handle message when send

// Prompt for username on connecting to server
socket.on("connect", function () {
  console.log("An socket connect: ",socket.id_user);
  // myUsername = prompt("Enter name: ");
  myUserId = prompt("Enter id: ");
  myUsername = 'user'+Math.round(Date.now() / 1000);
  // myUserId = Math.round(Date.now() / 1000);

  //Create User, Create Room (with that username)

  socket.emit("createUser", {"id_user": myUserId, "name": myUsername});

});

// Send message on button click
sendMessageBtn.addEventListener("click", function () {
    if (hasImg) {
      uploadToFileBase();
    } else {
      sendMsg();
    }
});

// Send message on enter key press
message.addEventListener("keyup", function (event) {
  if (event.key === "Enter") {
    sendMessageBtn.click();
  }
});

// Create new room on button click
createRoomBtn.addEventListener("click", function () {
  // socket.emit("createRoom", prompt("Enter new room: "));
  let roomName = roomInput.value.trim();
  if (roomName !== "") {
    socket.emit("createRoom", roomName);
    roomInput.value = "";
  }
});

socket.on("updateChat", function (id,username, data) {
  console.log("Event socket updateChat with",username, data);
  if (username === "INFO") {
    console.log("Displaying announcement");
    chatDisplay.innerHTML += `<div class="announcement"><span>${data}</span></div>`;
  } else {
    console.log("Displaying user message"); //me

    if (checkURL(data)) {
      chatDisplay.innerHTML +=  `<div class="message_holder ${
        id == myUserId ? "me" : ""
      }">
                                  <div class="pic"></div>
                                  <div class="message_box">
                                    <div id="message" class="message">
                                      <span class="message_name">${username}</span>
                                      <img class="message_pic" src="${data}" alt="your image" height="150px"/>
                                    </div>
                                  </div>
                                </div>`;
    } else {
      chatDisplay.innerHTML += `<div class="message_holder ${
        id == myUserId ? "me" : ""
      }">
                                  <div class="pic"></div>
                                  <div class="message_box">
                                    <div id="message" class="message">
                                      <span class="message_name">${username}</span>
                                      <span class="message_text">${data}</span>
                                    </div>
                                  </div>
                                </div>`;
    }

  }

  chatDisplay.scrollTop = chatDisplay.scrollHeight;
});

socket.on("updateUsers", function (userInfos) {
  userlist.innerHTML = "";
  console.log("usernames returned from server", userInfos);
  for (var userIndex in userInfos) {
    userlist.innerHTML += `<div class="user_card">
                              <div class="pic"></div>
                              <span>${userInfos[userIndex].name} - ${userInfos[userIndex].id_user}</span>
                            </div>`;
  }
});

socket.on("updateRooms", function (rooms, newRoom) {
  roomlist.innerHTML = "";
  console.log("UpdateRoom: ",rooms,newRoom)
  for (var index in rooms) {
    roomlist.innerHTML += `<div class="room_card" id="${rooms[index].id}">
                                <div class="room_item_content">
                                    <div class="pic"></div>
                                    <div class="roomInfo">
                                    <span class="room_name">${rooms[index].name}</span>
                                    </div>
                                </div>
                            </div>`;
  }

  if (newRoom) {
    document.getElementById(newRoom).classList.add("active_item");
  } else {
    document.getElementById(myUserId).classList.add("active_item");
  }
  bindFunction();
});

function changeRoom(room) {
  if (room != currentRoom) {
    socket.emit("updateRooms", room);
    document.getElementById(currentRoom).classList.remove("active_item");
    currentRoom = room;
    document.getElementById(currentRoom).classList.add("active_item");
  }
}

function bindFunction() {
  // onclick="changeRoom('${rooms[index].name}')"

  [...document.getElementsByClassName("room_card")].forEach(element => {
    element.addEventListener("click",()=>{
      console.log(element.id);
      changeRoom(element.id)
    })
  });
}



//Tai anh len:

var file;

document.getElementById("file").addEventListener('change', (e) => {
	console.log(event);
	file = event.target.files[0];
	console.log(file);
    output.src = URL.createObjectURL(event.target.files[0]);
	output.style.display = "block";
    output.onload = function() {
      URL.revokeObjectURL(output.src) // free memory
    }

    hasImg = true;
})

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-app.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-storage.js";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/learn-more#config-object
const firebaseConfig = {
    apiKey: "AIzaSyCenHuhDER2MN5S5jt8j7DMWaPBQcYFQAw",
    authDomain: "uploadfiletofirebase-ae63f.firebaseapp.com",
    projectId: "uploadfiletofirebase-ae63f",
    storageBucket: "uploadfiletofirebase-ae63f.appspot.com",
    messagingSenderId: "548678075768",
    appId: "1:548678075768:web:d9a471afe85756f666348d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


// Initialize Cloud Storage and get a reference to the service
const storage = getStorage(app);

function uploadToFileBase() {
      const metadata = {
      contentType: 'image/jpeg'
    };
    const storage = getStorage();
    const storageRef = ref(storage, 'images/' + file.name);
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);
  //       uploadBytes(storageRef, file).then((snapshot) => {
  //     console.log('Uploaded a blob or file!');
  // });

  uploadTask.on('state_changed',
  (snapshot) => {
  // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
  const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
  console.log('Upload is ' + progress + '% done');
  switch (snapshot.state) {
    case 'paused':
    console.log('Upload is paused');
    break;
    case 'running':
    console.log('Upload is running');
    break;
  }
  }, 
  (error) => {
  // A full list of error codes is available at
  // https://firebase.google.com/docs/storage/web/handle-errors
  switch (error.code) {
    case 'storage/unauthorized':
    // User doesn't have permission to access the object
    break;
    case 'storage/canceled':
    // User canceled the upload
    break;

    // ...

    case 'storage/unknown':
    // Unknown error occurred, inspect error.serverResponse
    break;
  }
  }, 
  () => {
  // Upload completed successfully, now we can get the download URL
  getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
    console.log('File available at', downloadURL);
    hasImg = false;
    output.style.display = "none";
    
    sendMsg(downloadURL);

    // chatBox.scrollTop = chatBox.scrollHeight;
  });
  }
  );

}

function checkURL(url) {
  return url?.includes("uploadfiletofirebase-ae63f.appspot.com");
}
