// controllers/serviceController.js
import Service from "../models/Service.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

// Create service reminder
export const createServiceReminder = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      bikeNumberPlate,
      serviceType,
      title,
      description,
      scheduledFor,
      message,
      priority = 'medium',
      recurrencePattern
    } = req.body;

    // Validate required fields
    if (!bikeNumberPlate || !serviceType || !title || !scheduledFor) {
      return res.status(400).json({ 
        message: "Bike number plate, service type, title, and scheduled date are required" 
      });
    }

    // Get user's bike information
    const user = await User.findById(userId).select('bikes');
    const bike = user.bikes.find(b => b.numberPlate === bikeNumberPlate);
    
    if (!bike) {
      return res.status(404).json({ message: "Bike not found" });
    }

    const serviceData = {
      owner: userId,
      bike: {
        brand: bike.brand,
        model: bike.model,
        numberPlate: bike.numberPlate,
        color: bike.color,
        odometerReading: 0 // Will be updated when service is logged
      },
      serviceType,
      title,
      description,
      serviceDate: new Date(scheduledFor),
      status: 'scheduled',
      priority,
      isRecurring: !!recurrencePattern,
      recurrencePattern: recurrencePattern || { type: 'yearly', interval: 1 },
      reminders: [{
        type: 'next_service',
        scheduledFor: new Date(scheduledFor),
        message: message || `Service reminder for ${bike.brand} ${bike.model}`,
        priority,
        isActive: true,
        sent: false
      }]
    };

    const service = new Service(serviceData);
    await service.save();

    res.status(201).json({
      message: "Service reminder created successfully",
      service: {
        _id: service._id,
        title: service.title,
        description: service.description,
        serviceType: service.serviceType,
        bike: service.bike,
        serviceDate: service.serviceDate,
        nextServiceDate: service.nextServiceDate,
        priority: service.priority,
        isRecurring: service.isRecurring,
        recurrencePattern: service.recurrencePattern,
        reminders: service.reminders,
        createdAt: service.createdAt
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get service history
export const getServiceHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { 
      page = 1, 
      limit = 20, 
      bikeNumberPlate, 
      serviceType, 
      startDate, 
      endDate,
      sortBy = 'serviceDate',
      sortOrder = 'desc'
    } = req.query;

    const query = { owner: userId };
    
    // Apply filters
    if (bikeNumberPlate) query['bike.numberPlate'] = bikeNumberPlate;
    if (serviceType) query.serviceType = serviceType;
    if (startDate || endDate) {
      query.serviceDate = {};
      if (startDate) query.serviceDate.$gte = new Date(startDate);
      if (endDate) query.serviceDate.$lte = new Date(endDate);
    }

    // Build sort object
    let sort = {};
    switch (sortBy) {
      case 'serviceDate':
        sort.serviceDate = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'totalCost':
        sort['costs.totalCost'] = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'createdAt':
        sort.createdAt = sortOrder === 'desc' ? -1 : 1;
        break;
      default:
        sort.serviceDate = -1;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const services = await Service.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const totalServices = await Service.countDocuments(query);

    res.json({
      services: services.map(service => ({
        _id: service._id,
        title: service.title,
        description: service.description,
        serviceType: service.serviceType,
        serviceCategory: service.serviceCategory,
        bike: service.bike,
        serviceProvider: service.serviceProvider,
        location: service.location,
        serviceDate: service.serviceDate,
        nextServiceDate: service.nextServiceDate,
        nextServiceOdometer: service.nextServiceOdometer,
        serviceItems: service.serviceItems,
        costs: service.costs,
        status: service.status,
        notes: service.notes,
        media: service.media,
        rating: service.rating,
        tags: service.tags,
        priority: service.priority,
        isRecurring: service.isRecurring,
        recurrencePattern: service.recurrencePattern,
        createdAt: service.createdAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalServices / parseInt(limit)),
        totalServices,
        hasMore: skip + services.length < totalServices
      },
      filters: {
        bikeNumberPlate,
        serviceType,
        startDate,
        endDate,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Log a service
export const logService = async (req, res) => {
  try {
    const userId = req.user._id;
    const serviceData = {
      ...req.body,
      owner: userId,
      status: 'completed'
    };

    const service = new Service(serviceData);
    await service.save();

    // Create notification for next service reminder
    if (service.nextServiceDate) {
      await Notification.create({
        recipient: userId,
        title: "Service Completed",
        message: `Service completed for ${service.bike.brand} ${service.bike.model}. Next service due on ${service.nextServiceDate.toDateString()}`,
        type: 'service_completed',
        relatedEntity: {
          type: 'service',
          id: service._id
        }
      });
    }

    res.status(201).json({
      message: "Service logged successfully",
      service: {
        _id: service._id,
        title: service.title,
        description: service.description,
        serviceType: service.serviceType,
        serviceCategory: service.serviceCategory,
        bike: service.bike,
        serviceProvider: service.serviceProvider,
        location: service.location,
        serviceDate: service.serviceDate,
        nextServiceDate: service.nextServiceDate,
        nextServiceOdometer: service.nextServiceOdometer,
        serviceItems: service.serviceItems,
        costs: service.costs,
        status: service.status,
        notes: service.notes,
        media: service.media,
        rating: service.rating,
        tags: service.tags,
        priority: service.priority,
        isRecurring: service.isRecurring,
        recurrencePattern: service.recurrencePattern,
        createdAt: service.createdAt
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get upcoming services
export const getUpcomingServices = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 10 } = req.query;

    const services = await Service.findUpcomingServices(userId, parseInt(limit));

    res.json({
      services: services.map(service => ({
        _id: service._id,
        title: service.title,
        description: service.description,
        serviceType: service.serviceType,
        bike: service.bike,
        serviceDate: service.serviceDate,
        nextServiceDate: service.nextServiceDate,
        priority: service.priority,
        status: service.status,
        reminders: service.reminders.filter(r => r.isActive),
        createdAt: service.createdAt
      })),
      totalUpcoming: services.length
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get overdue services
export const getOverdueServices = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 10 } = req.query;

    const services = await Service.findOverdueServices(userId, parseInt(limit));

    res.json({
      services: services.map(service => ({
        _id: service._id,
        title: service.title,
        description: service.description,
        serviceType: service.serviceType,
        bike: service.bike,
        serviceDate: service.serviceDate,
        nextServiceDate: service.nextServiceDate,
        priority: service.priority,
        status: service.status,
        daysOverdue: Math.ceil((new Date() - service.serviceDate) / (1000 * 60 * 60 * 24)),
        createdAt: service.createdAt
      })),
      totalOverdue: services.length
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get service reminders
export const getServiceReminders = async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const services = await Service.findReminders(userId, start, end);

    const reminders = [];
    services.forEach(service => {
      service.reminders.forEach(reminder => {
        if (reminder.isActive && !reminder.sent && 
            reminder.scheduledFor >= start && reminder.scheduledFor <= end) {
          reminders.push({
            _id: reminder._id,
            serviceId: service._id,
            serviceTitle: service.title,
            serviceType: service.serviceType,
            bike: service.bike,
            type: reminder.type,
            scheduledFor: reminder.scheduledFor,
            message: reminder.message,
            priority: reminder.priority
          });
        }
      });
    });

    // Sort by scheduled date
    reminders.sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));

    res.json({
      reminders,
      totalReminders: reminders.length,
      dateRange: {
        startDate: start,
        endDate: end
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update service reminder
export const updateServiceReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { scheduledFor, message, priority, isActive } = req.body;

    const service = await Service.findOne({ _id: id, owner: userId });
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Update reminder
    if (scheduledFor) service.serviceDate = new Date(scheduledFor);
    if (message) service.description = message;
    if (priority) service.priority = priority;

    // Update the reminder
    if (service.reminders.length > 0) {
      const reminder = service.reminders[0];
      if (scheduledFor) reminder.scheduledFor = new Date(scheduledFor);
      if (message) reminder.message = message;
      if (priority) reminder.priority = priority;
      if (isActive !== undefined) reminder.isActive = isActive;
    }

    await service.save();

    res.json({
      message: "Service reminder updated successfully",
      service: {
        _id: service._id,
        title: service.title,
        description: service.description,
        serviceDate: service.serviceDate,
        priority: service.priority,
        reminders: service.reminders.filter(r => r.isActive)
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete service reminder
export const deleteServiceReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const service = await Service.findOne({ _id: id, owner: userId });
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    await Service.findByIdAndDelete(id);

    res.json({ message: "Service reminder deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get service statistics
export const getServiceStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await Service.getServiceStats(userId);

    if (stats.length === 0) {
      return res.json({
        totalServices: 0,
        totalCost: 0,
        averageCost: 0,
        byType: {},
        byProvider: {},
        upcomingServices: 0,
        overdueServices: 0
      });
    }

    const userStats = stats[0];
    
    // Get upcoming and overdue counts
    const [upcomingServices, overdueServices] = await Promise.all([
      Service.countDocuments({ owner: userId, status: { $in: ['scheduled', 'in_progress'] }, serviceDate: { $gte: new Date() } }),
      Service.countDocuments({ owner: userId, status: { $in: ['scheduled', 'in_progress'] }, serviceDate: { $lt: new Date() } })
    ]);

    // Process type breakdown
    const byType = {};
    userStats.byType.forEach(item => {
      byType[item.type] = (byType[item.type] || 0) + 1;
    });

    // Process provider breakdown
    const byProvider = {};
    userStats.byProvider.forEach(item => {
      byProvider[item.provider] = (byProvider[item.provider] || 0) + 1;
    });

    res.json({
      totalServices: userStats.totalServices,
      totalCost: userStats.totalCost,
      averageCost: Math.round(userStats.averageCost),
      byType,
      byProvider,
      upcomingServices,
      overdueServices
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Rate a service
export const rateService = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { overall, quality, timeliness, communication, value, comment, wouldRecommend } = req.body;

    const service = await Service.findOne({ _id: id, owner: userId });
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    const ratingData = {
      overall,
      quality,
      timeliness,
      communication,
      value,
      comment,
      wouldRecommend
    };

    await service.addRating(ratingData);

    res.json({
      message: "Service rated successfully",
      rating: service.rating
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
