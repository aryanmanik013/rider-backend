// utils/socket.js
let ioInstance = null;

export const setSocketInstance = (io) => {
  ioInstance = io;
};

export const getSocketInstance = () => {
  return ioInstance;
};

export const sendNotificationToUser = (userId, notification) => {
  if (ioInstance) {
    const { sendNotificationToUser } = require('../socket/socketHandlers.js');
    sendNotificationToUser(ioInstance, userId, notification);
  }
};

export const broadcastToTrip = (tripId, event, data) => {
  if (ioInstance) {
    const { broadcastToTrip } = require('../socket/socketHandlers.js');
    broadcastToTrip(ioInstance, tripId, event, data);
  }
};

export const isUserOnline = (userId) => {
  if (ioInstance) {
    const { isUserOnline } = require('../socket/socketHandlers.js');
    return isUserOnline(userId);
  }
  return false;
};

export default {
  setSocketInstance,
  getSocketInstance,
  sendNotificationToUser,
  broadcastToTrip,
  isUserOnline
};
