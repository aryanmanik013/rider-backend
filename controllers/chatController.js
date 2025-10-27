// controllers/chatController.js
import Message from "../models/Message.js";
import Trip from "../models/Trip.js";

// Get all conversations (trips) for the current user
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Find all trips where user is organizer or participant
    const trips = await Trip.find({
      $or: [
        { organizer: userId },
        { 'participants.user': userId }
      ],
      status: { $in: ['planning', 'scheduled', 'active'] }
    })
    .select('title _id organizer participants scheduledDate status')
    .populate('organizer', 'name avatar')
    .populate('participants.user', 'name avatar')
    .sort({ updatedAt: -1 });

    // Get last message for each trip
    const conversations = await Promise.all(trips.map(async (trip) => {
      const lastMessage = await Message.findOne({ trip: trip._id })
        .populate('sender', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(1)
        .lean();
      
      return {
        tripId: trip._id,
        title: trip.title,
        organizer: trip.organizer,
        scheduledDate: trip.scheduledDate,
        status: trip.status,
        participants: trip.participants,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          sender: lastMessage.sender,
          createdAt: lastMessage.createdAt
        } : null,
        unreadCount: 0 // Could be implemented later
      };
    }));

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { tripId, content } = req.body;
    
    if (!tripId || !content) {
      return res.status(400).json({ message: "Please provide tripId and content" });
    }

    const message = await Message.create({
      sender: req.user._id,
      trip: tripId,
      content
    });

    // Populate sender info
    await message.populate('sender', 'name email');
    
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get messages for a trip
export const getMessages = async (req, res) => {
  try {
    const { tripId } = req.params;
    
    const messages = await Message.find({ trip: tripId })
      .populate('sender', 'name email')
      .sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};