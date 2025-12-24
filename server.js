const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }
});

app.use(cors());

// deviceCode -> socketId
const devices = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // register device
  socket.on("register-device", (data) => {
    socket.deviceCode = data.code;
    devices[data.code] = socket.id;
    console.log("Registered:", data.code);
  });

  // connect two devices
  socket.on("connect-to-code", (data) => {
    if (data.fromCode === data.targetCode) {
      socket.emit("connection-failure", { message: "Cannot connect to yourself" });
      return;
    }

    const targetSocketId = devices[data.targetCode];
    if (!targetSocketId) {
      socket.emit("connection-failure", { message: "Target device not online" });
      return;
    }

    socket.connectedTo = targetSocketId;
    io.sockets.sockets.get(targetSocketId).connectedTo = socket.id;

    socket.emit("connection-success");
    io.to(targetSocketId).emit("connection-success");
  });

  // message forward
  socket.on("send-message", (data) => {
    if (socket.connectedTo) {
      io.to(socket.connectedTo).emit("receive-message", data);
    }
  });

  // file forward
  socket.on("send-file", (data) => {
    if (socket.connectedTo) {
      io.to(socket.connectedTo).emit("receive-file", data);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (socket.deviceCode) delete devices[socket.deviceCode];

    if (socket.connectedTo) {
      io.to(socket.connectedTo).emit("connection-failure", {
        message: "Other device disconnected"
      });
    }
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
