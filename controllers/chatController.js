// controllers/chatController.js
import Message from "../models/Message.js";

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