const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());

// deviceCode -> socketId
const devices = {};

// socketId -> socketId (pair)
const connections = {};

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // register device
  socket.on("register-device", ({ code }) => {
    socket.deviceCode = code;
    devices[code] = socket.id;
  });

  // connect two devices
  socket.on("connect-to-code", ({ fromCode, targetCode }) => {
    if (fromCode === targetCode) {
      socket.emit("connection-failure", { message: "Cannot connect to yourself" });
      return;
    }

    const targetSocketId = devices[targetCode];
    if (!targetSocketId) {
      socket.emit("connection-failure", { message: "Target not online" });
      return;
    }

    if (connections[socket.id] || connections[targetSocketId]) {
      socket.emit("connection-failure", { message: "Device already connected" });
      return;
    }

    connections[socket.id] = targetSocketId;
    connections[targetSocketId] = socket.id;

    socket.emit("connection-success");
    io.to(targetSocketId).emit("connection-success");
  });

  // send message
  socket.on("send-message", (data) => {
    const target = connections[socket.id];
    if (target) {
      io.to(target).emit("receive-message", data);
      socket.emit("delivered", { id: data.mid });
    }
  });

  // typing
  socket.on("typing", (state) => {
    const target = connections[socket.id];
    if (target) {
      io.to(target).emit("typing", state);
    }
  });

  // disconnect
  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);

    const target = connections[socket.id];
    if (target) {
      io.to(target).emit("connection-failure", { message: "User disconnected" });
      delete connections[target];
    }

    delete connections[socket.id];
    if (socket.deviceCode) delete devices[socket.deviceCode];
  });
});

server.listen(process.env.PORT || 3000, () =>
  console.log("Server running")
);
