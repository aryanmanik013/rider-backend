// controllers/nearbyController.js
import TrackingSession from "../models/TrackingSession.js";
import User from "../models/User.js";
import Trip from "../models/Trip.js";

// Find nearby riders within given radius
export const findNearbyRiders = async (req, res) => {
  try {
    const { lat, lng, radius_km = 10, limit = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ 
        message: "Latitude and longitude are required" 
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radius = parseFloat(radius_km);

    // Find active tracking sessions within radius
    const activeSessions = await TrackingSession.find({
      status: { $in: ['active', 'paused'] },
      'currentLocation.lat': { $exists: true },
      'currentLocation.lng': { $exists: true }
    })
      .populate('rider', 'name avatar bikes location')
      .populate('trip', 'title startLocation endLocation')
      .limit(parseInt(limit));

    // Filter sessions within radius and calculate distances
    const nearbyRiders = [];
    
    for (const session of activeSessions) {
      if (session.currentLocation && session.currentLocation.lat && session.currentLocation.lng) {
        const distance = calculateDistance(
          userLat, userLng,
          session.currentLocation.lat, session.currentLocation.lng
        );

        if (distance <= radius) {
          nearbyRiders.push({
            sessionId: session.sessionId,
            rider: {
              _id: session.rider._id,
              name: session.rider.name,
              avatar: session.rider.avatar,
              bikes: session.rider.bikes,
              location: session.rider.location
            },
            trip: session.trip ? {
              _id: session.trip._id,
              title: session.trip.title,
              startLocation: session.trip.startLocation,
              endLocation: session.trip.endLocation
            } : null,
            currentLocation: {
              lat: session.currentLocation.lat,
              lng: session.currentLocation.lng,
              timestamp: session.currentLocation.timestamp
            },
            distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
            status: session.status,
            totalDistance: session.totalDistance,
            averageSpeed: session.averageSpeed,
            startedAt: session.startedAt
          });
        }
      }
    }

    // Sort by distance (closest first)
    nearbyRiders.sort((a, b) => a.distance - b.distance);

    res.json({
      nearbyRiders: nearbyRiders.slice(0, parseInt(limit)),
      searchLocation: {
        lat: userLat,
        lng: userLng,
        radius: radius
      },
      totalFound: nearbyRiders.length
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Find nearby riders by trip (riders on similar routes)
export const findNearbyRidersByTrip = async (req, res) => {
  try {
    const { tripId, lat, lng, radius_km = 5 } = req.query;

    if (!tripId || !lat || !lng) {
      return res.status(400).json({ 
        message: "Trip ID, latitude and longitude are required" 
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radius = parseFloat(radius_km);

    // Find the trip to get its route
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Find active sessions for this trip
    const tripSessions = await TrackingSession.find({
      trip: tripId,
      status: { $in: ['active', 'paused'] },
      'currentLocation.lat': { $exists: true },
      'currentLocation.lng': { $exists: true }
    })
      .populate('rider', 'name avatar bikes location');

    // Filter sessions within radius
    const nearbyTripRiders = [];
    
    for (const session of tripSessions) {
      if (session.currentLocation && session.currentLocation.lat && session.currentLocation.lng) {
        const distance = calculateDistance(
          userLat, userLng,
          session.currentLocation.lat, session.currentLocation.lng
        );

        if (distance <= radius) {
          nearbyTripRiders.push({
            sessionId: session.sessionId,
            rider: {
              _id: session.rider._id,
              name: session.rider.name,
              avatar: session.rider.avatar,
              bikes: session.rider.bikes,
              location: session.rider.location
            },
            currentLocation: {
              lat: session.currentLocation.lat,
              lng: session.currentLocation.lng,
              timestamp: session.currentLocation.timestamp
            },
            distance: Math.round(distance * 100) / 100,
            status: session.status,
            totalDistance: session.totalDistance,
            averageSpeed: session.averageSpeed,
            startedAt: session.startedAt
          });
        }
      }
    }

    // Sort by distance
    nearbyTripRiders.sort((a, b) => a.distance - b.distance);

    res.json({
      trip: {
        _id: trip._id,
        title: trip.title,
        startLocation: trip.startLocation,
        endLocation: trip.endLocation
      },
      nearbyTripRiders,
      searchLocation: {
        lat: userLat,
        lng: userLng,
        radius: radius
      },
      totalFound: nearbyTripRiders.length
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get rider's current location (for live tracking)
export const getRiderLocation = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await TrackingSession.findOne({ sessionId })
      .populate('rider', 'name avatar')
      .populate('trip', 'title');

    if (!session) {
      return res.status(404).json({ message: "Tracking session not found" });
    }

    if (!session.currentLocation) {
      return res.status(404).json({ message: "No current location available" });
    }

    res.json({
      sessionId: session.sessionId,
      rider: {
        _id: session.rider._id,
        name: session.rider.name,
        avatar: session.rider.avatar
      },
      trip: session.trip ? {
        _id: session.trip._id,
        title: session.trip.title
      } : null,
      currentLocation: session.currentLocation,
      status: session.status,
      totalDistance: session.totalDistance,
      averageSpeed: session.averageSpeed,
      lastUpdated: session.currentLocation.timestamp
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper function to calculate distance between two points
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
