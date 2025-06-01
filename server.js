const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }
});

// Handle socket connection
io.on('connection', (socket) => {
  console.log('New client connected');

  // Handling connection to a specific device ID
  socket.on('connect-to-id', (targetId) => {
    console.log(`Connection request to: ${targetId}`);
    // Implement your custom logic here if needed
  });

  // Handling text messages
  socket.on('send-message', (data) => {
    console.log(`Message from ${data.id}: ${data.text}`);
    io.emit('receive-message', { id: data.id, text: data.text });
  });

  // Handling file transfers
  socket.on('send-file', (data) => {
    console.log(`File from ${data.id}: ${data.filename}`);
    io.emit('receive-file', { id: data.id, filename: data.filename });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});