// controllers/trackingController.js
import TrackingSession from "../models/TrackingSession.js";
import Trip from "../models/Trip.js";
import User from "../models/User.js";

// Start ride tracking session
export const startTracking = async (req, res) => {
  try {
    const { tripId, startedAt } = req.body;
    const userId = req.user._id;

    if (!tripId) {
      return res.status(400).json({ message: "Trip ID is required" });
    }

    // Verify trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Check if user is a participant in the trip
    const isParticipant = trip.participants.some(p => 
      p.user.toString() === userId.toString() && p.status === 'approved'
    );

    if (!isParticipant && trip.organizer.toString() !== userId.toString()) {
      return res.status(403).json({ 
        message: "You must be a participant in this trip to start tracking" 
      });
    }

    // Check if user already has an active session for this trip
    const existingSession = await TrackingSession.findOne({
      trip: tripId,
      rider: userId,
      status: { $in: ['active', 'paused'] }
    });

    if (existingSession) {
      return res.status(400).json({ 
        message: "You already have an active tracking session for this trip",
        sessionId: existingSession.sessionId
      });
    }

    // Create new tracking session
    const session = await TrackingSession.create({
      trip: tripId,
      rider: userId,
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      status: 'active',
      sessionId: `TRK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    // Add session to trip
    trip.trackingSessions.push(session._id);
    await trip.save();

    // Populate session data
    await session.populate('trip', 'title startLocation endLocation');
    await session.populate('rider', 'name avatar bikes');

    res.status(201).json({
      message: "Tracking session started successfully",
      session: {
        sessionId: session.sessionId,
        trip: {
          _id: session.trip._id,
          title: session.trip.title,
          startLocation: session.trip.startLocation,
          endLocation: session.trip.endLocation
        },
        rider: {
          _id: session.rider._id,
          name: session.rider.name,
          avatar: session.rider.avatar,
          bikes: session.rider.bikes
        },
        startedAt: session.startedAt,
        status: session.status,
        totalDistance: session.totalDistance,
        totalDuration: session.totalDuration,
        averageSpeed: session.averageSpeed,
        maxSpeed: session.maxSpeed
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Send periodic location point during ride tracking
export const sendLocationPoint = async (req, res) => {
  try {
    const { sessionId, lat, lng, timestamp, speed, altitude, accuracy } = req.body;

    if (!sessionId || !lat || !lng) {
      return res.status(400).json({ 
        message: "Session ID, latitude and longitude are required" 
      });
    }

    const session = await TrackingSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: "Tracking session not found" });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ message: "Session is not active" });
    }

    // Add new route point
    const routePoint = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      speed: speed ? parseFloat(speed) : null,
      altitude: altitude ? parseFloat(altitude) : null,
      accuracy: accuracy ? parseFloat(accuracy) : null
    };

    session.routePoints.push(routePoint);
    session.currentLocation = {
      lat: routePoint.lat,
      lng: routePoint.lng,
      accuracy: routePoint.accuracy,
      timestamp: routePoint.timestamp
    };

    // Update statistics
    if (session.routePoints.length > 1) {
      const lastPoint = session.routePoints[session.routePoints.length - 2];
      const currentPoint = session.routePoints[session.routePoints.length - 1];
      
      // Calculate distance between points
      const distance = calculateDistance(
        lastPoint.lat, lastPoint.lng,
        currentPoint.lat, currentPoint.lng
      );
      
      session.totalDistance += distance;
      
      // Update speed statistics
      if (currentPoint.speed) {
        session.averageSpeed = calculateAverageSpeed(session.routePoints);
        if (currentPoint.speed > session.maxSpeed) {
          session.maxSpeed = currentPoint.speed;
        }
      }
    }

    await session.save();

    res.json({
      message: "Location point recorded successfully",
      currentLocation: session.currentLocation,
      totalDistance: session.totalDistance,
      averageSpeed: session.averageSpeed,
      maxSpeed: session.maxSpeed,
      routePointsCount: session.routePoints.length
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update location during tracking (legacy endpoint)
export const updateLocation = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { lat, lng, speed, altitude, accuracy } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ message: "Latitude and longitude are required" });
    }

    const session = await TrackingSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: "Tracking session not found" });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ message: "Session is not active" });
    }

    // Add new route point
    const routePoint = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      speed: speed ? parseFloat(speed) : null,
      altitude: altitude ? parseFloat(altitude) : null,
      accuracy: accuracy ? parseFloat(accuracy) : null
    };

    session.routePoints.push(routePoint);
    session.currentLocation = {
      lat: routePoint.lat,
      lng: routePoint.lng,
      accuracy: routePoint.accuracy,
      timestamp: new Date()
    };

    // Update statistics
    if (session.routePoints.length > 1) {
      const lastPoint = session.routePoints[session.routePoints.length - 2];
      const currentPoint = session.routePoints[session.routePoints.length - 1];
      
      // Calculate distance between points
      const distance = calculateDistance(
        lastPoint.lat, lastPoint.lng,
        currentPoint.lat, currentPoint.lng
      );
      
      session.totalDistance += distance;
      
      // Update speed statistics
      if (currentPoint.speed) {
        session.averageSpeed = calculateAverageSpeed(session.routePoints);
        if (currentPoint.speed > session.maxSpeed) {
          session.maxSpeed = currentPoint.speed;
        }
      }
    }

    await session.save();

    res.json({
      message: "Location updated successfully",
      currentLocation: session.currentLocation,
      totalDistance: session.totalDistance,
      averageSpeed: session.averageSpeed,
      maxSpeed: session.maxSpeed,
      routePointsCount: session.routePoints.length
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Pause tracking session
export const pauseTracking = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reason } = req.body;

    const session = await TrackingSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: "Tracking session not found" });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ message: "Session is not active" });
    }

    session.status = 'paused';
    
    // Record pause
    session.pauses.push({
      startTime: new Date(),
      reason: reason || 'Manual pause'
    });

    await session.save();

    res.json({
      message: "Tracking session paused",
      status: session.status,
      pauseCount: session.pauses.length
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Resume tracking session
export const resumeTracking = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await TrackingSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: "Tracking session not found" });
    }

    if (session.status !== 'paused') {
      return res.status(400).json({ message: "Session is not paused" });
    }

    session.status = 'active';
    
    // End the last pause
    if (session.pauses.length > 0) {
      const lastPause = session.pauses[session.pauses.length - 1];
      if (!lastPause.endTime) {
        lastPause.endTime = new Date();
        lastPause.duration = Math.round((lastPause.endTime - lastPause.startTime) / (1000 * 60));
        session.totalPauseTime += lastPause.duration;
      }
    }

    await session.save();

    res.json({
      message: "Tracking session resumed",
      status: session.status,
      totalPauseTime: session.totalPauseTime
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Stop tracking session and finalize trip stats
export const stopTracking = async (req, res) => {
  try {
    const { sessionId, endedAt } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    const session = await TrackingSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: "Tracking session not found" });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ message: "Session is already completed" });
    }

    session.status = 'completed';
    session.endedAt = endedAt ? new Date(endedAt) : new Date();

    // End any active pause
    if (session.pauses.length > 0) {
      const lastPause = session.pauses[session.pauses.length - 1];
      if (!lastPause.endTime) {
        lastPause.endTime = session.endedAt;
        lastPause.duration = Math.round((lastPause.endTime - lastPause.startTime) / (1000 * 60));
        session.totalPauseTime += lastPause.duration;
      }
    }

    // Calculate final statistics
    const totalDuration = Math.round((session.endedAt - session.startedAt) / (1000 * 60)); // minutes
    session.totalDuration = totalDuration;

    // Calculate average speed if we have distance and duration
    if (session.totalDistance > 0 && totalDuration > 0) {
      const activeDuration = totalDuration - session.totalPauseTime;
      if (activeDuration > 0) {
        session.averageSpeed = Math.round((session.totalDistance / activeDuration) * 60); // km/h
      }
    }

    await session.save();

    // Update trip statistics
    const trip = await Trip.findById(session.trip);
    if (trip) {
      // Update trip status if this was the last active session
      const activeSessions = await TrackingSession.countDocuments({
        trip: session.trip,
        status: { $in: ['active', 'paused'] }
      });
      
      if (activeSessions === 0) {
        trip.status = 'completed';
        await trip.save();
      }
    }

    res.json({
      message: "Tracking session stopped and finalized",
      session: {
        sessionId: session.sessionId,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        totalDuration: session.totalDuration,
        totalDistance: session.totalDistance,
        averageSpeed: session.averageSpeed,
        maxSpeed: session.maxSpeed,
        totalPauseTime: session.totalPauseTime,
        routePointsCount: session.routePoints.length,
        status: session.status
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// End tracking session (legacy endpoint)
export const endTracking = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await TrackingSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: "Tracking session not found" });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ message: "Session is already completed" });
    }

    session.status = 'completed';
    session.endedAt = new Date();

    // End any active pause
    if (session.pauses.length > 0) {
      const lastPause = session.pauses[session.pauses.length - 1];
      if (!lastPause.endTime) {
        lastPause.endTime = session.endedAt;
        lastPause.duration = Math.round((lastPause.endTime - lastPause.startTime) / (1000 * 60));
        session.totalPauseTime += lastPause.duration;
      }
    }

    await session.save();

    res.json({
      message: "Tracking session completed",
      session: {
        sessionId: session.sessionId,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        totalDuration: session.totalDuration,
        totalDistance: session.totalDistance,
        averageSpeed: session.averageSpeed,
        maxSpeed: session.maxSpeed,
        totalPauseTime: session.totalPauseTime,
        routePointsCount: session.routePoints.length
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get tracking session details
export const getTrackingSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await TrackingSession.findOne({ sessionId })
      .populate('trip', 'title startLocation endLocation')
      .populate('rider', 'name avatar');

    if (!session) {
      return res.status(404).json({ message: "Tracking session not found" });
    }

    res.json({
      sessionId: session.sessionId,
      trip: {
        _id: session.trip._id,
        title: session.trip.title,
        startLocation: session.trip.startLocation,
        endLocation: session.trip.endLocation
      },
      rider: {
        _id: session.rider._id,
        name: session.rider.name,
        avatar: session.rider.avatar
      },
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      status: session.status,
      currentLocation: session.currentLocation,
      totalDistance: session.totalDistance,
      totalDuration: session.totalDuration,
      averageSpeed: session.averageSpeed,
      maxSpeed: session.maxSpeed,
      totalPauseTime: session.totalPauseTime,
      routePoints: session.routePoints,
      pauses: session.pauses,
      alerts: session.alerts,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper functions
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const calculateAverageSpeed = (routePoints) => {
  const pointsWithSpeed = routePoints.filter(p => p.speed && p.speed > 0);
  if (pointsWithSpeed.length === 0) return 0;
  
  const totalSpeed = pointsWithSpeed.reduce((sum, point) => sum + point.speed, 0);
  return Math.round(totalSpeed / pointsWithSpeed.length);
};
