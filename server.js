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
// socketId -> socketId
const connections = {};

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("register-device", ({ code }) => {
    socket.deviceCode = code;
    devices[code] = socket.id;
  });

  socket.on("connect-to-code", ({ fromCode, targetCode }) => {
    if (fromCode === targetCode) {
      socket.emit("connection-failure", { message: "Self connection not allowed" });
      return;
    }

    const targetId = devices[targetCode];
    if (!targetId) {
      socket.emit("connection-failure", { message: "Target offline" });
      return;
    }

    if (connections[socket.id] || connections[targetId]) {
      socket.emit("connection-failure", { message: "Already connected" });
      return;
    }

    connections[socket.id] = targetId;
    connections[targetId] = socket.id;

    socket.emit("connection-success");
    io.to(targetId).emit("connection-success");
  });

  socket.on("send-message", (data) => {
    const target = connections[socket.id];
    if (target) io.to(target).emit("receive-message", data);
  });

  socket.on("typing", (state) => {
    const target = connections[socket.id];
    if (target) io.to(target).emit("typing", state);
  });

  socket.on("send-file", (data) => {
    const target = connections[socket.id];
    if (target) io.to(target).emit("receive-file", data);
  });

  socket.on("disconnect", () => {
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
