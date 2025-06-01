const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// Global mapping for devices: deviceCode -> socket id
const devices = {};

app.use(cors());

io.on("connection", (socket) => {
  console.log("User connected: " + socket.id);

  // Register device with its 6-digit code.
  socket.on("register-device", (data) => {
    // data = { code: "123456" }
    socket.deviceCode = data.code;
    devices[data.code] = socket.id;
    console.log(`Device registered: ${data.code} with socket id ${socket.id}`);
  });

  // Handle connection request from one device to another using 6-digit codes.
  socket.on("connect-to-code", (data) => {
    console.log(`Connection request from ${data.fromCode} to ${data.targetCode}`);

    // Prevent self-connection.
    if (data.fromCode === data.targetCode) {
      socket.emit("connection-failure", { message: "Cannot connect to yourself." });
      return;
    }

    // Check if target device is registered.
    const targetSocketId = devices[data.targetCode];
    if (!targetSocketId) {
      socket.emit("connection-failure", { message: "Target device not available." });
      return;
    }

    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (!targetSocket) {
      socket.emit("connection-failure", { message: "Target device not available." });
      return;
    }

    // Establish the pair connection.
    socket.connectedTo = targetSocketId;
    targetSocket.connectedTo = socket.id;

    // Notify both devices that connection has been established.
    socket.emit("connection-success", { message: "Connected with device " + data.targetCode });
    targetSocket.emit("connection-success", { message: "Connected with device " + data.fromCode });
  });

  // Forward text messages only to the connected partner.
  socket.on("send-message", (data) => {
    if (socket.connectedTo) {
      const targetSocket = io.sockets.sockets.get(socket.connectedTo);
      if (targetSocket) {
        targetSocket.emit("receive-message", data);
      }
    }
  });

  // Forward file sharing events only to the connected partner.
  socket.on("send-file", (data) => {
    if (socket.connectedTo) {
      const targetSocket = io.sockets.sockets.get(socket.connectedTo);
      if (targetSocket) {
        targetSocket.emit("receive-file", data);
      }
    }
  });

  // Clean up on disconnect.
  socket.on("disconnect", () => {
    console.log("User disconnected: " + socket.id);
    // Remove device from mapping.
    if (socket.deviceCode) {
      delete devices[socket.deviceCode];
    }
    // Inform the connected partner (if any) about the disconnection.
    if (socket.connectedTo) {
      const targetSocket = io.sockets.sockets.get(socket.connectedTo);
      if (targetSocket) {
        targetSocket.emit("connection-failure", { message: "The other device has disconnected." });
        targetSocket.connectedTo = null;
      }
    }
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running on port " + (process.env.PORT || 3000));
});