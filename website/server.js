const express = require("express");

let io = require("socket.io")({
  path: "/io/website",
});

const app = express();

const port = 8080;

//app.get("/", (req, res) => res.send("Hello World"));
//express middleware to serve all static files in the build folder connecting front with back
app.use(express.static(__dirname + "/build"));
app.get("/", (req, res, next) => {
  res.sendFile(__dirname + "build/index.html");
});

const server = app.listen(port, () => console.log("App connected"));

io.listen(server);

const peers = io.of("/webrtcPeer");

// keep a reference of all socket connections
let connectedPeers = new Map();

peers.on("connection", (socket) => {
  console.log(socket.id);
  socket.emit("connection-success", { success: socket.id }); //id goes to the client
  connectedPeers.set(socket.id, socket);

  socket.on("disconnect", () => {
    console.log("disconnected");
    connectedPeers.delete(socket.id);
  });

  socket.on("offerOrAnswer", (data) => {
    // send to the other peer(s) if any
    for (const [socketId, socket] of connectedPeers.entries()) {
      // don't send to self
      if (socketId !== data.socketID) {
        console.log(socketId, data.payload.type);
        socket.emit("offerOrAnswer", data.payload);
      }
    }
  });

  socket.on("candidate", (data) => {
    // send candidate to the other peer(s) if any
    for (const [socketId, socket] of connectedPeers.entries()) {
      // don't send to self
      if (socketId !== data.socketID) {
        console.log(socketId, data.payload.type);
        socket.emit("candidate", data.payload);
      }
    }
  });
});
