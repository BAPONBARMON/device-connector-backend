const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }
});

// Optional: A simple GET route so that when you open the URL in a browser, a message is displayed.
app.get('/', (req, res) => {
  res.send("Socket.IO Server is running.");
});

io.on('connection', (socket) => {
  console.log('New client connected');

  // Event: Handle text messages from clients
  socket.on('send-message', (data) => {
    console.log(`Message from ${data.id}: ${data.text}`);
    io.emit('receive-message', { id: data.id, text: data.text });
  });

  // Event: Handle file transfers from clients
  socket.on('send-file', (data) => {
    console.log(`File from ${data.id}: ${data.filename}`);
    io.emit('receive-file', { id: data.id, filename: data.filename });
  });

  // New Event: Handle connection request using a 6-digit code
  socket.on('connect-to-code', ({ id, code }) => {
    console.log(`Connect request received from ${id} with code: ${code}`);
    
    // Here you can add your custom validation logic.
    // For example: if the code is exactly 6 digits and numeric, consider the connection successful.
    if (code && code.length === 6 && !isNaN(code)) {
      // Successful connection: Notify all clients (or only specific clients if needed)
      io.emit('connection-success', { id, code });
    } else {
      // If validation fails, emit a failure event
      socket.emit('connection-failure', { message: 'Invalid code. Please check and try again.' });
    }
  });

  // Handle client disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});