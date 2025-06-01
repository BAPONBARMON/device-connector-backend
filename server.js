const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// Object to store registered devices: key is device code, value is socket.id
const devices = {};

app.get('/', (req, res) => {
  res.send("Socket.IO Server is running.");
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // When a device registers its unique 6-digit code
  socket.on('register-device', ({ code }) => {
    devices[code] = socket.id;
    socket.deviceCode = code; // store the code in the socket for later removal
    console.log(`Device registered with code: ${code}`);
  });

  // When a device attempts to connect using a target code
  socket.on('connect-to-code', ({ fromCode, targetCode }) => {
    console.log(`Connection attempt from device ${fromCode} to target code ${targetCode}`);
    // Prevent self-connection
    if (fromCode === targetCode) {
      socket.emit('connection-failure', { message: 'Cannot connect to self.' });
      return;
    }
    // Check if the target code is registered
    if (devices[targetCode]) {
      const targetSocketId = devices[targetCode];
      // Emit success event to both the requesting device and the target device
      socket.emit('connection-success', { fromCode, targetCode });
      io.to(targetSocketId).emit('connection-success', { fromCode, targetCode });
      console.log(`Connection established between ${fromCode} and ${targetCode}`);
    } else {
      socket.emit('connection-failure', { message: 'Target device not found or offline.' });
      console.log(`Connection failed: Target code ${targetCode} not registered.`);
    }
  });

  // Handle text messages from clients
  socket.on('send-message', (data) => {
    console.log(`Message from ${data.id}: ${data.text}`);
    io.emit('receive-message', { id: data.id, text: data.text });
  });

  // Handle file transfer events
  socket.on('send-file', (data) => {
    console.log(`File from ${data.id}: ${data.filename}`);
    io.emit('receive-file', { id: data.id, filename: data.filename });
  });

  // On client disconnect, remove the device from the registration map
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (socket.deviceCode) {
      delete devices[socket.deviceCode];
      console.log(`Device with code ${socket.deviceCode} removed from registry.`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});