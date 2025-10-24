// socket/socketHandlers.js
import Message from "../models/Message.js";
import Trip from "../models/Trip.js";
import TrackingSession from "../models/TrackingSession.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

// Store active connections
const activeConnections = new Map();
const userRooms = new Map();

// Socket connection handler
export const handleConnection = (io, socket) => {
  console.log(`User ${socket.user.name} connected with socket ID: ${socket.id}`);
  
  // Store user connection
  activeConnections.set(socket.userId, {
    socketId: socket.id,
    user: socket.user,
    connectedAt: new Date(),
    lastSeen: new Date()
  });

  // Join user to their personal room
  socket.join(`user_${socket.userId}`);
  userRooms.set(socket.userId, `user_${socket.userId}`);

  // Send connection confirmation
  socket.emit('connected', {
    message: 'Connected successfully',
    userId: socket.userId,
    user: {
      _id: socket.user._id,
      name: socket.user.name,
      avatar: socket.user.avatar
    }
  });

  // Handle chat events
  handleChatEvents(io, socket);
  
  // Handle location sharing events
  handleLocationEvents(io, socket);
  
  // Handle trip events
  handleTripEvents(io, socket);
  
  // Handle notification events
  handleNotificationEvents(io, socket);

  // Handle disconnection
  socket.on('disconnect', () => {
    handleDisconnection(socket);
  });
};

// Chat event handlers
const handleChatEvents = (io, socket) => {
  // Join trip chat room
  socket.on('join_trip_chat', async (data) => {
    try {
      const { tripId } = data;
      
      // Verify user is part of the trip
      const trip = await Trip.findById(tripId);
      if (!trip) {
        socket.emit('error', { message: 'Trip not found' });
        return;
      }

      const isParticipant = trip.participants.some(p => p.user.toString() === socket.userId);
      if (!isParticipant && trip.organizer.toString() !== socket.userId) {
        socket.emit('error', { message: 'Not authorized to join this chat' });
        return;
      }

      socket.join(`trip_${tripId}`);
      socket.emit('joined_trip_chat', { tripId, message: 'Joined trip chat successfully' });
      
      // Notify others in the room
      socket.to(`trip_${tripId}`).emit('user_joined_chat', {
        user: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar
        },
        message: `${socket.user.name} joined the chat`
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to join trip chat' });
    }
  });

  // Leave trip chat room
  socket.on('leave_trip_chat', (data) => {
    const { tripId } = data;
    socket.leave(`trip_${tripId}`);
    socket.emit('left_trip_chat', { tripId, message: 'Left trip chat successfully' });
    
    // Notify others in the room
    socket.to(`trip_${tripId}`).emit('user_left_chat', {
      user: {
        _id: socket.user._id,
        name: socket.user.name,
        avatar: socket.user.avatar
      },
      message: `${socket.user.name} left the chat`
    });
  });

  // Send message
  socket.on('send_message', async (data) => {
    try {
      const { tripId, content, type = 'text' } = data;
      
      if (!content || !tripId) {
        socket.emit('error', { message: 'Content and tripId are required' });
        return;
      }

      // Verify user is part of the trip
      const trip = await Trip.findById(tripId);
      if (!trip) {
        socket.emit('error', { message: 'Trip not found' });
        return;
      }

      const isParticipant = trip.participants.some(p => p.user.toString() === socket.userId);
      if (!isParticipant && trip.organizer.toString() !== socket.userId) {
        socket.emit('error', { message: 'Not authorized to send messages' });
        return;
      }

      // Create message
      const message = new Message({
        sender: socket.userId,
        trip: tripId,
        content,
        type,
        timestamp: new Date()
      });

      await message.save();

      // Populate sender details
      await message.populate('sender', 'name avatar');

      // Broadcast message to all users in the trip chat
      io.to(`trip_${tripId}`).emit('new_message', {
        _id: message._id,
        sender: {
          _id: message.sender._id,
          name: message.sender.name,
          avatar: message.sender.avatar
        },
        content: message.content,
        type: message.type,
        timestamp: message.timestamp,
        tripId: tripId
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on('typing_start', (data) => {
    const { tripId } = data;
    socket.to(`trip_${tripId}`).emit('user_typing', {
      user: {
        _id: socket.user._id,
        name: socket.user.name
      },
      isTyping: true
    });
  });

  socket.on('typing_stop', (data) => {
    const { tripId } = data;
    socket.to(`trip_${tripId}`).emit('user_typing', {
      user: {
        _id: socket.user._id,
        name: socket.user.name
      },
      isTyping: false
    });
  });
};

// Location sharing event handlers
const handleLocationEvents = (io, socket) => {
  // Start sharing location
  socket.on('start_location_sharing', async (data) => {
    try {
      const { tripId, lat, lng, accuracy } = data;
      
      // Verify user is part of the trip
      const trip = await Trip.findById(tripId);
      if (!trip) {
        socket.emit('error', { message: 'Trip not found' });
        return;
      }

      const isParticipant = trip.participants.some(p => p.user.toString() === socket.userId);
      if (!isParticipant && trip.organizer.toString() !== socket.userId) {
        socket.emit('error', { message: 'Not authorized to share location' });
        return;
      }

      // Join location sharing room
      socket.join(`location_${tripId}`);
      
      // Broadcast location to other participants
      socket.to(`location_${tripId}`).emit('user_location_update', {
        user: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar
        },
        location: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          accuracy: parseFloat(accuracy),
          timestamp: new Date()
        },
        tripId: tripId
      });

      socket.emit('location_sharing_started', { 
        message: 'Location sharing started successfully',
        tripId: tripId
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to start location sharing' });
    }
  });

  // Update location
  socket.on('update_location', (data) => {
    const { tripId, lat, lng, accuracy, speed, heading } = data;
    
    // Broadcast location update to other participants
    socket.to(`location_${tripId}`).emit('user_location_update', {
      user: {
        _id: socket.user._id,
        name: socket.user.name,
        avatar: socket.user.avatar
      },
      location: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        accuracy: parseFloat(accuracy),
        speed: speed ? parseFloat(speed) : null,
        heading: heading ? parseFloat(heading) : null,
        timestamp: new Date()
      },
      tripId: tripId
    });
  });

  // Stop sharing location
  socket.on('stop_location_sharing', (data) => {
    const { tripId } = data;
    socket.leave(`location_${tripId}`);
    
    // Notify others that user stopped sharing
    socket.to(`location_${tripId}`).emit('user_stopped_sharing', {
      user: {
        _id: socket.user._id,
        name: socket.user.name,
        avatar: socket.user.avatar
      },
      message: `${socket.user.name} stopped sharing location`
    });

    socket.emit('location_sharing_stopped', { 
      message: 'Location sharing stopped successfully',
      tripId: tripId
    });
  });
};

// Trip event handlers
const handleTripEvents = (io, socket) => {
  // Trip started
  socket.on('trip_started', async (data) => {
    try {
      const { tripId, sessionId } = data;
      
      // Update trip status
      const trip = await Trip.findByIdAndUpdate(
        tripId,
        { status: 'active' },
        { new: true }
      ).populate('participants.user', 'name avatar');

      if (!trip) {
        socket.emit('error', { message: 'Trip not found' });
        return;
      }

      // Notify all participants
      const participantIds = trip.participants.map(p => p.user._id.toString());
      participantIds.forEach(userId => {
        const connection = activeConnections.get(userId);
        if (connection) {
          io.to(connection.socketId).emit('trip_status_update', {
            tripId: trip._id,
            status: 'active',
            message: `Trip "${trip.title}" has started!`,
            organizer: {
              _id: trip.organizer._id,
              name: trip.organizer.name,
              avatar: trip.organizer.avatar
            }
          });
        }
      });

      // Create notifications for offline users
      await Notification.create({
        recipient: { $in: participantIds },
        sender: trip.organizer,
        title: "Trip Started",
        message: `Trip "${trip.title}" has started!`,
        type: 'trip_started',
        relatedEntity: {
          type: 'trip',
          id: trip._id
        }
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to start trip' });
    }
  });

  // Trip completed
  socket.on('trip_completed', async (data) => {
    try {
      const { tripId, stats } = data;
      
      // Update trip status
      const trip = await Trip.findByIdAndUpdate(
        tripId,
        { 
          status: 'completed',
          completedAt: new Date(),
          stats: stats
        },
        { new: true }
      ).populate('participants.user', 'name avatar');

      if (!trip) {
        socket.emit('error', { message: 'Trip not found' });
        return;
      }

      // Notify all participants
      const participantIds = trip.participants.map(p => p.user._id.toString());
      participantIds.forEach(userId => {
        const connection = activeConnections.get(userId);
        if (connection) {
          io.to(connection.socketId).emit('trip_status_update', {
            tripId: trip._id,
            status: 'completed',
            message: `Trip "${trip.title}" has been completed!`,
            stats: stats,
            organizer: {
              _id: trip.organizer._id,
              name: trip.organizer.name,
              avatar: trip.organizer.avatar
            }
          });
        }
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to complete trip' });
    }
  });

  // Trip update
  socket.on('trip_update', async (data) => {
    try {
      const { tripId, updateType, updateData } = data;
      
      const trip = await Trip.findById(tripId).populate('participants.user', 'name avatar');
      if (!trip) {
        socket.emit('error', { message: 'Trip not found' });
        return;
      }

      // Notify all participants about the update
      const participantIds = trip.participants.map(p => p.user._id.toString());
      participantIds.forEach(userId => {
        const connection = activeConnections.get(userId);
        if (connection) {
          io.to(connection.socketId).emit('trip_update', {
            tripId: trip._id,
            updateType: updateType,
            updateData: updateData,
            updatedBy: {
              _id: socket.user._id,
              name: socket.user.name,
              avatar: socket.user.avatar
            },
            timestamp: new Date()
          });
        }
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to update trip' });
    }
  });
};

// Notification event handlers
const handleNotificationEvents = (io, socket) => {
  // Send notification to specific user
  socket.on('send_notification', async (data) => {
    try {
      const { recipientId, title, message, type, data: notificationData } = data;
      
      // Check if recipient is online
      const recipientConnection = activeConnections.get(recipientId);
      
      if (recipientConnection) {
        // Send real-time notification
        io.to(recipientConnection.socketId).emit('notification', {
          title,
          message,
          type,
          data: notificationData,
          timestamp: new Date()
        });
      }

      // Save notification to database
      await Notification.create({
        recipient: recipientId,
        sender: socket.userId,
        title,
        message,
        type: type || 'general',
        relatedEntity: notificationData?.relatedEntity,
        actionData: notificationData?.actionData,
        metadata: notificationData?.metadata
      });

      socket.emit('notification_sent', { 
        message: 'Notification sent successfully',
        recipientId: recipientId
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to send notification' });
    }
  });

  // Mark notification as read
  socket.on('mark_notification_read', async (data) => {
    try {
      const { notificationId } = data;
      
      await Notification.findByIdAndUpdate(
        notificationId,
        { 
          status: 'read',
          readAt: new Date()
        }
      );

      socket.emit('notification_marked_read', { 
        message: 'Notification marked as read',
        notificationId: notificationId
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to mark notification as read' });
    }
  });
};

// Handle disconnection
const handleDisconnection = (socket) => {
  console.log(`User ${socket.user.name} disconnected`);
  
  // Remove from active connections
  activeConnections.delete(socket.userId);
  userRooms.delete(socket.userId);
  
  // Update last seen
  if (socket.user) {
    User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() }).catch(console.error);
  }
};

// Utility functions
export const sendNotificationToUser = (io, userId, notification) => {
  const connection = activeConnections.get(userId);
  if (connection) {
    io.to(connection.socketId).emit('notification', notification);
  }
};

export const broadcastToTrip = (io, tripId, event, data) => {
  io.to(`trip_${tripId}`).emit(event, data);
};

export const getActiveConnections = () => {
  return Array.from(activeConnections.values());
};

export const isUserOnline = (userId) => {
  return activeConnections.has(userId);
};

export default {
  handleConnection,
  sendNotificationToUser,
  broadcastToTrip,
  getActiveConnections,
  isUserOnline
};
