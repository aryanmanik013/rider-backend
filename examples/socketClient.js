// examples/socketClient.js
// This is an example client-side implementation for testing Socket.io functionality
// You can use this in your frontend application

import { io } from 'socket.io-client';

class RiderSocketClient {
  constructor(token, serverUrl = 'http://localhost:5000') {
    this.socket = io(serverUrl, {
      auth: {
        token: token
      }
    });
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Connection events
    this.socket.on('connected', (data) => {
      console.log('Connected to server:', data);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Chat events
    this.socket.on('new_message', (message) => {
      console.log('New message:', message);
      // Handle new message in your UI
    });

    this.socket.on('user_joined_chat', (data) => {
      console.log('User joined chat:', data);
    });

    this.socket.on('user_left_chat', (data) => {
      console.log('User left chat:', data);
    });

    this.socket.on('user_typing', (data) => {
      console.log('User typing:', data);
    });

    // Location events
    this.socket.on('user_location_update', (data) => {
      console.log('Location update:', data);
      // Update user location on map
    });

    this.socket.on('user_stopped_sharing', (data) => {
      console.log('User stopped sharing:', data);
    });

    // Trip events
    this.socket.on('trip_status_update', (data) => {
      console.log('Trip status update:', data);
    });

    this.socket.on('trip_update', (data) => {
      console.log('Trip update:', data);
    });

    // Notification events
    this.socket.on('notification', (notification) => {
      console.log('New notification:', notification);
      // Show notification in UI
    });
  }

  // Chat methods
  joinTripChat(tripId) {
    this.socket.emit('join_trip_chat', { tripId });
  }

  leaveTripChat(tripId) {
    this.socket.emit('leave_trip_chat', { tripId });
  }

  sendMessage(tripId, content, type = 'text') {
    this.socket.emit('send_message', { tripId, content, type });
  }

  startTyping(tripId) {
    this.socket.emit('typing_start', { tripId });
  }

  stopTyping(tripId) {
    this.socket.emit('typing_stop', { tripId });
  }

  // Location sharing methods
  startLocationSharing(tripId, lat, lng, accuracy) {
    this.socket.emit('start_location_sharing', { tripId, lat, lng, accuracy });
  }

  updateLocation(tripId, lat, lng, accuracy, speed, heading) {
    this.socket.emit('update_location', { tripId, lat, lng, accuracy, speed, heading });
  }

  stopLocationSharing(tripId) {
    this.socket.emit('stop_location_sharing', { tripId });
  }

  // Trip methods
  startTrip(tripId, sessionId) {
    this.socket.emit('trip_started', { tripId, sessionId });
  }

  completeTrip(tripId, stats) {
    this.socket.emit('trip_completed', { tripId, stats });
  }

  updateTrip(tripId, updateType, updateData) {
    this.socket.emit('trip_update', { tripId, updateType, updateData });
  }

  // Notification methods
  sendNotification(recipientId, title, message, type, data) {
    this.socket.emit('send_notification', { recipientId, title, message, type, data });
  }

  markNotificationRead(notificationId) {
    this.socket.emit('mark_notification_read', { notificationId });
  }

  // Utility methods
  disconnect() {
    this.socket.disconnect();
  }

  isConnected() {
    return this.socket.connected;
  }
}

// Usage example:
/*
const token = 'your-jwt-token-here';
const socketClient = new RiderSocketClient(token);

// Join a trip chat
socketClient.joinTripChat('trip-id-here');

// Send a message
socketClient.sendMessage('trip-id-here', 'Hello everyone!');

// Start sharing location
socketClient.startLocationSharing('trip-id-here', 28.6139, 77.2090, 10);

// Update location
socketClient.updateLocation('trip-id-here', 28.6140, 77.2091, 10, 25, 90);

// Start a trip
socketClient.startTrip('trip-id-here', 'session-id-here');

// Send notification
socketClient.sendNotification('user-id-here', 'Test', 'This is a test notification', 'general');
*/

export default RiderSocketClient;
