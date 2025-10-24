// controllers/eventsController.js
import Event from "../models/Event.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

// Create a new event
export const createEvent = async (req, res) => {
  try {
    const userId = req.user._id;
    const eventData = {
      ...req.body,
      organizer: userId
    };

    const event = new Event(eventData);
    await event.save();

    // Populate organizer details
    await event.populate('organizer', 'name avatar');

    res.status(201).json({
      message: "Event created successfully",
      event: {
        _id: event._id,
        title: event.title,
        description: event.description,
        eventType: event.eventType,
        category: event.category,
        startDate: event.startDate,
        endDate: event.endDate,
        registrationDeadline: event.registrationDeadline,
        location: event.location,
        requirements: event.requirements,
        capacity: event.capacity,
        pricing: event.pricing,
        itinerary: event.itinerary,
        route: event.route,
        media: event.media,
        contact: event.contact,
        status: event.status,
        visibility: event.visibility,
        tags: event.tags,
        weatherPolicy: event.weatherPolicy,
        rules: event.rules,
        guidelines: event.guidelines,
        organizer: {
          _id: event.organizer._id,
          name: event.organizer.name,
          avatar: event.organizer.avatar
        },
        createdAt: event.createdAt
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get events with filtering and pagination
export const getEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      eventType,
      category,
      city,
      state,
      startDate,
      endDate,
      status = 'published',
      sortBy = 'startDate',
      sortOrder = 'asc'
    } = req.query;

    const query = { visibility: 'public' };
    
    // Apply filters
    if (eventType) query.eventType = eventType;
    if (category) query.category = category;
    if (city) query['location.city'] = { $regex: city, $options: 'i' };
    if (state) query['location.state'] = { $regex: state, $options: 'i' };
    if (status) query.status = status;
    
    // Date filters
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    // Build sort object
    let sort = {};
    switch (sortBy) {
      case 'startDate':
        sort.startDate = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'createdAt':
        sort.createdAt = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'participants':
        sort['capacity.currentParticipants'] = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'views':
        sort['stats.views'] = sortOrder === 'desc' ? -1 : 1;
        break;
      default:
        sort.startDate = 1;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const events = await Event.find(query)
      .populate('organizer', 'name avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const totalEvents = await Event.countDocuments(query);

    // Format response
    const formattedEvents = events.map(event => ({
      _id: event._id,
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      category: event.category,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationDeadline: event.registrationDeadline,
      location: event.location,
      requirements: event.requirements,
      capacity: event.capacity,
      pricing: event.pricing,
      itinerary: event.itinerary,
      route: event.route,
      media: event.media,
      contact: event.contact,
      status: event.status,
      visibility: event.visibility,
      tags: event.tags,
      stats: event.stats,
      organizer: {
        _id: event.organizer._id,
        name: event.organizer.name,
        avatar: event.organizer.avatar
      },
      createdAt: event.createdAt
    }));

    res.json({
      events: formattedEvents,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalEvents / parseInt(limit)),
        totalEvents,
        hasMore: skip + events.length < totalEvents
      },
      filters: {
        eventType,
        category,
        city,
        state,
        startDate,
        endDate,
        status,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get event by ID
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const event = await Event.findById(id)
      .populate('organizer', 'name avatar bio location')
      .populate('participants.user', 'name avatar')
      .populate('waitlist.user', 'name avatar')
      .populate('feedback.reviews.user', 'name avatar');

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check visibility
    if (event.visibility === 'private' && event.organizer._id.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Increment views
    await event.incrementViews();

    // Check if user is participating
    const isParticipating = event.participants.some(p => p.user._id.toString() === userId.toString());
    const isOnWaitlist = event.waitlist.some(w => w.user._id.toString() === userId.toString());

    res.json({
      event: {
        _id: event._id,
        title: event.title,
        description: event.description,
        eventType: event.eventType,
        category: event.category,
        startDate: event.startDate,
        endDate: event.endDate,
        registrationDeadline: event.registrationDeadline,
        location: event.location,
        requirements: event.requirements,
        capacity: event.capacity,
        pricing: event.pricing,
        itinerary: event.itinerary,
        route: event.route,
        media: event.media,
        contact: event.contact,
        status: event.status,
        visibility: event.visibility,
        tags: event.tags,
        weatherPolicy: event.weatherPolicy,
        rules: event.rules,
        guidelines: event.guidelines,
        stats: {
          ...event.stats,
          views: event.stats.views + 1
        },
        feedback: event.feedback,
        organizer: {
          _id: event.organizer._id,
          name: event.organizer.name,
          avatar: event.organizer.avatar,
          bio: event.organizer.bio,
          location: event.organizer.location
        },
        participants: event.participants.map(p => ({
          _id: p.user._id,
          name: p.user.name,
          avatar: p.user.avatar,
          joinedAt: p.joinedAt,
          status: p.status
        })),
        waitlist: event.waitlist.map(w => ({
          _id: w.user._id,
          name: w.user.name,
          avatar: w.user.avatar,
          joinedAt: w.joinedAt
        })),
        isParticipating,
        isOnWaitlist,
        createdAt: event.createdAt
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Join an event
export const joinEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if event is published and registration is open
    if (event.status !== 'published') {
      return res.status(400).json({ message: "Event is not accepting registrations" });
    }

    if (new Date() > event.registrationDeadline) {
      return res.status(400).json({ message: "Registration deadline has passed" });
    }

    // Check if user is already participating
    const isAlreadyParticipating = event.participants.some(p => p.user.toString() === userId.toString());
    if (isAlreadyParticipating) {
      return res.status(400).json({ message: "You are already participating in this event" });
    }

    // Check if user is on waitlist
    const isOnWaitlist = event.waitlist.some(w => w.user.toString() === userId.toString());
    if (isOnWaitlist) {
      return res.status(400).json({ message: "You are already on the waitlist" });
    }

    // Add participant
    const result = event.addParticipant(userId);
    await event.save();

    // Create notification for organizer
    await Notification.create({
      recipient: event.organizer,
      sender: userId,
      title: "New Event Registration",
      message: `A new participant has joined your event "${event.title}"`,
      type: 'event_registration',
      relatedEntity: {
        type: 'event',
        id: event._id
      }
    });

    res.json({
      message: result.type === 'waitlist' ? "Added to waitlist" : "Successfully joined event",
      type: result.type,
      event: {
        _id: event._id,
        title: event.title,
        capacity: event.capacity,
        participants: event.participants.length,
        waitlist: event.waitlist.length
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Leave an event
export const leaveEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const result = event.removeParticipant(userId);
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    await event.save();

    res.json({
      message: "Successfully left the event",
      event: {
        _id: event._id,
        title: event.title,
        capacity: event.capacity,
        participants: event.participants.length,
        waitlist: event.waitlist.length
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get nearby events
export const getNearbyEvents = async (req, res) => {
  try {
    const { lat, lng, radius = 50, limit = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "Latitude and longitude are required" });
    }

    const events = await Event.findNearby(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius),
      parseInt(limit)
    );

    res.json({
      events: events.map(event => ({
        _id: event._id,
        title: event.title,
        description: event.description,
        eventType: event.eventType,
        category: event.category,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        capacity: event.capacity,
        pricing: event.pricing,
        media: event.media,
        stats: event.stats,
        organizer: {
          _id: event.organizer._id,
          name: event.organizer.name,
          avatar: event.organizer.avatar
        },
        distance: calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          event.location.coordinates.lat,
          event.location.coordinates.lng
        )
      })),
      totalEvents: events.length,
      searchParams: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius: parseFloat(radius)
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Rate an event
export const rateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user participated in the event
    const hasParticipated = event.participants.some(p => p.user.toString() === userId.toString());
    if (!hasParticipated) {
      return res.status(403).json({ message: "You can only rate events you participated in" });
    }

    await event.addRating(userId, rating, comment);

    res.json({
      message: "Rating submitted successfully",
      feedback: {
        averageRating: event.feedback.averageRating,
        totalRatings: event.feedback.totalRatings
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get user's events
export const getUserEvents = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, type = 'all' } = req.query;

    const query = { organizer: userId };
    
    if (type === 'upcoming') {
      query.startDate = { $gte: new Date() };
    } else if (type === 'past') {
      query.startDate = { $lt: new Date() };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const events = await Event.find(query)
      .populate('organizer', 'name avatar')
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalEvents = await Event.countDocuments(query);

    res.json({
      events: events.map(event => ({
        _id: event._id,
        title: event.title,
        description: event.description,
        eventType: event.eventType,
        category: event.category,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        capacity: event.capacity,
        pricing: event.pricing,
        status: event.status,
        visibility: event.visibility,
        stats: event.stats,
        createdAt: event.createdAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalEvents / parseInt(limit)),
        totalEvents,
        hasMore: skip + events.length < totalEvents
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper function to calculate distance
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};
