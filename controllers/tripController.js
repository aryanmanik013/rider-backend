// controllers/tripController.js
import Trip from "../models/Trip.js";
import User from "../models/User.js";

// Create a trip with route data & waypoints
export const createTrip = async (req, res) => {
  try {
    const {
      title,
      description,
      notes,
      waypoints = [],
      stops = [],
      scheduledDate,
      scheduledTime,
      maxParticipants = 10,
      difficulty = 'medium',
      tripType = 'leisure',
      visibility = 'public',
      requirements = [],
      weather,
      roadCondition,
      startLocation,
      endLocation
    } = req.body;

    if (!title || !scheduledDate || !scheduledTime) {
      return res.status(400).json({ 
        message: "Title, scheduled date and time are required" 
      });
    }

    if (waypoints.length < 2) {
      return res.status(400).json({ 
        message: "At least 2 waypoints are required" 
      });
    }

    // Validate waypoints
    for (let i = 0; i < waypoints.length; i++) {
      const waypoint = waypoints[i];
      if (!waypoint.lat || !waypoint.lng) {
        return res.status(400).json({ 
          message: `Waypoint ${i + 1} must have lat and lng` 
        });
      }
    }

    // Calculate distance and duration (simplified)
    const distance = calculateDistance(waypoints);
    const estimatedDuration = calculateDuration(distance);

    const trip = await Trip.create({
      organizer: req.user._id,
      title: title.trim(),
      description: description?.trim(),
      notes: notes?.trim(),
      waypoints: waypoints.map((wp, index) => ({
        ...wp,
        order: index
      })),
      stops: stops.map((stop, index) => ({
        ...stop,
        order: index
      })),
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      maxParticipants,
      difficulty,
      tripType,
      visibility,
      requirements,
      weather,
      roadCondition,
      startLocation: startLocation || {
        name: waypoints[0].name || 'Start Point',
        lat: waypoints[0].lat,
        lng: waypoints[0].lng
      },
      endLocation: endLocation || {
        name: waypoints[waypoints.length - 1].name || 'End Point',
        lat: waypoints[waypoints.length - 1].lat,
        lng: waypoints[waypoints.length - 1].lng
      },
      distance,
      estimatedDuration
    });

    await trip.populate('organizer', 'name avatar bikes location');

    res.status(201).json({
      message: "Trip created successfully",
      trip: {
        _id: trip._id,
        organizer: {
          _id: trip.organizer._id,
          name: trip.organizer.name,
          avatar: trip.organizer.avatar,
          bikes: trip.organizer.bikes,
          location: trip.organizer.location
        },
        title: trip.title,
        description: trip.description,
        notes: trip.notes,
        waypoints: trip.waypoints,
        stops: trip.stops,
        scheduledDate: trip.scheduledDate,
        scheduledTime: trip.scheduledTime,
        maxParticipants: trip.maxParticipants,
        difficulty: trip.difficulty,
        tripType: trip.tripType,
        visibility: trip.visibility,
        requirements: trip.requirements,
        weather: trip.weather,
        roadCondition: trip.roadCondition,
        startLocation: trip.startLocation,
        endLocation: trip.endLocation,
        distance: trip.distance,
        estimatedDuration: trip.estimatedDuration,
        participants: trip.participants,
        status: trip.status,
        likesCount: trip.likesCount,
        createdAt: trip.createdAt
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get trip details by ID
export const getTripDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const trip = await Trip.findById(id)
      .populate('organizer', 'name avatar bikes location')
      .populate('participants.user', 'name avatar bikes')
      .populate('trackingSessions', 'sessionId status startedAt totalDistance');

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.json({
      _id: trip._id,
      organizer: {
        _id: trip.organizer._id,
        name: trip.organizer.name,
        avatar: trip.organizer.avatar,
        bikes: trip.organizer.bikes,
        location: trip.organizer.location
      },
      title: trip.title,
      description: trip.description,
      notes: trip.notes,
      waypoints: trip.waypoints,
      stops: trip.stops,
      scheduledDate: trip.scheduledDate,
      scheduledTime: trip.scheduledTime,
      maxParticipants: trip.maxParticipants,
      difficulty: trip.difficulty,
      tripType: trip.tripType,
      visibility: trip.visibility,
      requirements: trip.requirements,
      weather: trip.weather,
      roadCondition: trip.roadCondition,
      startLocation: trip.startLocation,
      endLocation: trip.endLocation,
      distance: trip.distance,
      estimatedDuration: trip.estimatedDuration,
      participants: trip.participants.map(p => ({
        user: {
          _id: p.user._id,
          name: p.user.name,
          avatar: p.user.avatar,
          bikes: p.user.bikes
        },
        joinedAt: p.joinedAt,
        status: p.status
      })),
      status: trip.status,
      likesCount: trip.likesCount,
      trackingSessions: trip.trackingSessions,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Request to join a trip
export const joinTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const currentUserId = req.user._id;

    // Use userId from body or current user
    const targetUserId = userId || currentUserId;

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Check if trip is joinable
    if (trip.status !== 'planning' && trip.status !== 'scheduled') {
      return res.status(400).json({ 
        message: "Trip is not accepting new participants" 
      });
    }

    // Check if user is already a participant
    const existingParticipant = trip.participants.find(p => 
      p.user.toString() === targetUserId.toString()
    );

    if (existingParticipant) {
      return res.status(400).json({ 
        message: "User is already a participant in this trip" 
      });
    }

    // Check if trip is full
    if (trip.participants.length >= trip.maxParticipants) {
      return res.status(400).json({ 
        message: "Trip is full" 
      });
    }

    // Add participant
    trip.participants.push({
      user: targetUserId,
      status: 'pending'
    });

    await trip.save();
    await trip.populate('participants.user', 'name avatar');

    res.json({
      message: "Join request submitted successfully",
      participant: {
        user: {
          _id: targetUserId,
          name: trip.participants[trip.participants.length - 1].user.name,
          avatar: trip.participants[trip.participants.length - 1].user.avatar
        },
        status: 'pending',
        joinedAt: trip.participants[trip.participants.length - 1].joinedAt
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all trips with filters
export const getTrips = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      tripType, 
      difficulty,
      organizer 
    } = req.query;

    const query = { visibility: 'public' };
    
    if (status) query.status = status;
    if (tripType) query.tripType = tripType;
    if (difficulty) query.difficulty = difficulty;
    if (organizer) query.organizer = organizer;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const trips = await Trip.find(query)
      .populate('organizer', 'name avatar location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalTrips = await Trip.countDocuments(query);

    res.json({
      trips: trips.map(trip => ({
        _id: trip._id,
        organizer: {
          _id: trip.organizer._id,
          name: trip.organizer.name,
          avatar: trip.organizer.avatar,
          location: trip.organizer.location
        },
        title: trip.title,
        description: trip.description,
        waypoints: trip.waypoints,
        stops: trip.stops,
        scheduledDate: trip.scheduledDate,
        scheduledTime: trip.scheduledTime,
        maxParticipants: trip.maxParticipants,
        difficulty: trip.difficulty,
        tripType: trip.tripType,
        startLocation: trip.startLocation,
        endLocation: trip.endLocation,
        distance: trip.distance,
        estimatedDuration: trip.estimatedDuration,
        participantsCount: trip.participants.length,
        status: trip.status,
        likesCount: trip.likesCount,
        createdAt: trip.createdAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTrips / parseInt(limit)),
        totalTrips
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper functions
const calculateDistance = (waypoints) => {
  // Simplified distance calculation using Haversine formula
  let totalDistance = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const lat1 = waypoints[i].lat;
    const lng1 = waypoints[i].lng;
    const lat2 = waypoints[i + 1].lat;
    const lng2 = waypoints[i + 1].lng;
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    totalDistance += R * c;
  }
  return Math.round(totalDistance * 100) / 100;
};

const calculateDuration = (distance) => {
  // Estimate duration based on distance (assuming average speed of 60 km/h)
  return Math.round(distance * 60 / 60); // minutes
};