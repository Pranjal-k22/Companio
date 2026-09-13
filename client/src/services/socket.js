import { io } from 'socket.io-client';

let socket = null;

/**
 * Connect to the real-time Socket.io /voice namespace
 * @param {string} token - JWT authentication token
 */
export const connectVoiceSocket = (token) => {
  if (socket && socket.connected) {
    return socket;
  }

  // Socket.io client initialization targeting /voice namespace
  socket = io('/voice', {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log(`[Voice Socket Client] Connected to /voice namespace (Socket ID: ${socket.id})`);
  });

  socket.on('connect_error', (err) => {
    console.warn(`[Voice Socket Client Error] Connection failed: ${err.message}`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Voice Socket Client] Disconnected: ${reason}`);
  });

  return socket;
};

export const getVoiceSocket = () => socket;

export const disconnectVoiceSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
