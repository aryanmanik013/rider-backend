// controllers/subscriptionController.js
import Subscription from "../models/Subscription.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

// Upgrade subscription
export const upgradeSubscription = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      plan,
      billingCycle = 'monthly',
      paymentId,
      promoCode
    } = req.body;

    // Validate plan
    const validPlans = ['free', 'basic', 'premium', 'pro', 'enterprise'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ message: "Invalid subscription plan" });
    }

    // Get current subscription
    const currentSubscription = await Subscription.findActiveByUser(userId);
    
    // If upgrading from free plan, create new subscription
    if (!currentSubscription || currentSubscription.plan === 'free') {
      const subscriptionData = await createSubscriptionData(plan, billingCycle, promoCode);
      
      const subscription = new Subscription({
        user: userId,
        ...subscriptionData,
        payment: {
          paymentId: paymentId,
          lastPaymentDate: new Date(),
          autoRenew: true
        },
        metadata: {
          source: 'web',
          promoCode: promoCode,
          upgradeFrom: currentSubscription?.plan || 'free'
        }
      });

      await subscription.save();

      // Add to history
      subscription.history.push({
        action: 'created',
        toPlan: plan,
        paymentId: paymentId,
        date: new Date()
      });

      await subscription.save();

      res.status(201).json({
        message: "Subscription upgraded successfully",
        subscription: {
          _id: subscription._id,
          plan: subscription.plan,
          planName: subscription.planName,
          planDescription: subscription.planDescription,
          pricing: subscription.pricing,
          features: subscription.features,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          nextBillingDate: subscription.nextBillingDate,
          usage: subscription.usage,
          createdAt: subscription.createdAt
        }
      });

    } else {
      // Upgrade existing subscription
      await currentSubscription.upgrade(plan, paymentId);
      
      // Update pricing and features
      const subscriptionData = await createSubscriptionData(plan, billingCycle, promoCode);
      currentSubscription.planName = subscriptionData.planName;
      currentSubscription.planDescription = subscriptionData.planDescription;
      currentSubscription.pricing = subscriptionData.pricing;
      currentSubscription.features = subscriptionData.features;
      currentSubscription.payment.paymentId = paymentId;
      currentSubscription.payment.lastPaymentDate = new Date();

      await currentSubscription.save();

      res.json({
        message: "Subscription upgraded successfully",
        subscription: {
          _id: currentSubscription._id,
          plan: currentSubscription.plan,
          planName: currentSubscription.planName,
          planDescription: currentSubscription.planDescription,
          pricing: currentSubscription.pricing,
          features: currentSubscription.features,
          status: currentSubscription.status,
          startDate: currentSubscription.startDate,
          endDate: currentSubscription.endDate,
          nextBillingDate: currentSubscription.nextBillingDate,
          usage: currentSubscription.usage,
          history: currentSubscription.history
        }
      });
    }

    // Create notification
    await Notification.create({
      recipient: userId,
      title: "Subscription Upgraded",
      message: `Your subscription has been upgraded to ${plan} plan. Enjoy the new features!`,
      type: 'subscription_upgrade',
      relatedEntity: {
        type: 'subscription',
        id: currentSubscription?._id || 'new'
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get subscription details
export const getSubscription = async (req, res) => {
  try {
    const userId = req.user._id;

    const subscription = await Subscription.findActiveByUser(userId);
    
    if (!subscription) {
      return res.json({
        subscription: null,
        message: "No active subscription found"
      });
    }

    res.json({
      subscription: {
        _id: subscription._id,
        plan: subscription.plan,
        planName: subscription.planName,
        planDescription: subscription.planDescription,
        pricing: subscription.pricing,
        features: subscription.features,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        nextBillingDate: subscription.nextBillingDate,
        payment: subscription.payment,
        usage: subscription.usage,
        history: subscription.history,
        createdAt: subscription.createdAt
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Cancel subscription
export const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user._id;
    const { reason } = req.body;

    const subscription = await Subscription.findActiveByUser(userId);
    if (!subscription) {
      return res.status(404).json({ message: "No active subscription found" });
    }

    await subscription.cancel(reason);

    // Create notification
    await Notification.create({
      recipient: userId,
      title: "Subscription Cancelled",
      message: `Your ${subscription.plan} subscription has been cancelled. You can reactivate it anytime.`,
      type: 'subscription_cancelled',
      relatedEntity: {
        type: 'subscription',
        id: subscription._id
      }
    });

    res.json({
      message: "Subscription cancelled successfully",
      subscription: {
        _id: subscription._id,
        plan: subscription.plan,
        status: subscription.status,
        cancelledAt: subscription.cancelledAt,
        endDate: subscription.endDate
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Reactivate subscription
export const reactivateSubscription = async (req, res) => {
  try {
    const userId = req.user._id;
    const { paymentId } = req.body;

    const subscription = await Subscription.findOne({
      user: userId,
      status: 'cancelled'
    });

    if (!subscription) {
      return res.status(404).json({ message: "No cancelled subscription found" });
    }

    subscription.status = 'active';
    subscription.payment.autoRenew = true;
    subscription.payment.paymentId = paymentId;
    subscription.payment.lastPaymentDate = new Date();

    // Add to history
    subscription.history.push({
      action: 'reactivated',
      paymentId: paymentId,
      date: new Date()
    });

    await subscription.save();

    // Create notification
    await Notification.create({
      recipient: userId,
      title: "Subscription Reactivated",
      message: `Your ${subscription.plan} subscription has been reactivated successfully!`,
      type: 'subscription_reactivated',
      relatedEntity: {
        type: 'subscription',
        id: subscription._id
      }
    });

    res.json({
      message: "Subscription reactivated successfully",
      subscription: {
        _id: subscription._id,
        plan: subscription.plan,
        status: subscription.status,
        nextBillingDate: subscription.nextBillingDate
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get available plans
export const getAvailablePlans = async (req, res) => {
  try {
    const plans = [
      {
        plan: 'free',
        planName: 'Free Plan',
        planDescription: 'Basic features for getting started',
        pricing: {
          amount: 0,
          currency: 'INR',
          billingCycle: 'monthly',
          discount: 0,
          discountedAmount: 0
        },
        features: {
          maxTrips: 5,
          maxEvents: 2,
          maxPosts: 10,
          maxFriends: 50,
          maxStorage: 100,
          advancedAnalytics: false,
          prioritySupport: false,
          customBranding: false,
          apiAccess: false,
          whiteLabel: false
        }
      },
      {
        plan: 'basic',
        planName: 'Basic Plan',
        planDescription: 'Perfect for regular riders',
        pricing: {
          amount: 299,
          currency: 'INR',
          billingCycle: 'monthly',
          discount: 0,
          discountedAmount: 299
        },
        features: {
          maxTrips: 25,
          maxEvents: 10,
          maxPosts: 50,
          maxFriends: 200,
          maxStorage: 500,
          advancedAnalytics: false,
          prioritySupport: false,
          customBranding: false,
          apiAccess: false,
          whiteLabel: false
        }
      },
      {
        plan: 'premium',
        planName: 'Premium Plan',
        planDescription: 'Advanced features for enthusiasts',
        pricing: {
          amount: 599,
          currency: 'INR',
          billingCycle: 'monthly',
          discount: 0,
          discountedAmount: 599
        },
        features: {
          maxTrips: 100,
          maxEvents: 50,
          maxPosts: 200,
          maxFriends: 500,
          maxStorage: 2000,
          advancedAnalytics: true,
          prioritySupport: true,
          customBranding: false,
          apiAccess: false,
          whiteLabel: false
        }
      },
      {
        plan: 'pro',
        planName: 'Pro Plan',
        planDescription: 'Professional features for groups',
        pricing: {
          amount: 1299,
          currency: 'INR',
          billingCycle: 'monthly',
          discount: 0,
          discountedAmount: 1299
        },
        features: {
          maxTrips: 500,
          maxEvents: 200,
          maxPosts: 1000,
          maxFriends: 1000,
          maxStorage: 10000,
          advancedAnalytics: true,
          prioritySupport: true,
          customBranding: true,
          apiAccess: true,
          whiteLabel: false
        }
      },
      {
        plan: 'enterprise',
        planName: 'Enterprise Plan',
        planDescription: 'Complete solution for organizations',
        pricing: {
          amount: 2999,
          currency: 'INR',
          billingCycle: 'monthly',
          discount: 0,
          discountedAmount: 2999
        },
        features: {
          maxTrips: -1, // Unlimited
          maxEvents: -1, // Unlimited
          maxPosts: -1, // Unlimited
          maxFriends: -1, // Unlimited
          maxStorage: -1, // Unlimited
          advancedAnalytics: true,
          prioritySupport: true,
          customBranding: true,
          apiAccess: true,
          whiteLabel: true
        }
      }
    ];

    res.json({
      plans,
      currentUser: req.user._id
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Check usage limits
export const checkUsageLimits = async (req, res) => {
  try {
    const userId = req.user._id;
    const { feature } = req.query;

    const subscription = await Subscription.findActiveByUser(userId);
    
    if (!subscription) {
      return res.json({
        hasLimit: true,
        canUse: false,
        message: "No active subscription found"
      });
    }

    const canUse = subscription.checkUsageLimit(feature);
    const limits = subscription.features;
    const usage = subscription.usage;

    res.json({
      hasLimit: limits[`max${feature.charAt(0).toUpperCase() + feature.slice(1)}`] !== -1,
      canUse,
      limits: {
        max: limits[`max${feature.charAt(0).toUpperCase() + feature.slice(1)}`],
        used: usage[`${feature}Created`] || usage[`${feature}Added`] || usage[`${feature}Used`] || 0
      },
      subscription: {
        plan: subscription.plan,
        planName: subscription.planName
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get subscription history
export const getSubscriptionHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    const subscriptions = await Subscription.find({ user: userId })
      .sort({ createdAt: -1 });

    res.json({
      subscriptions: subscriptions.map(sub => ({
        _id: sub._id,
        plan: sub.plan,
        planName: sub.planName,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        pricing: sub.pricing,
        history: sub.history,
        createdAt: sub.createdAt
      }))
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper function to create subscription data
const createSubscriptionData = async (plan, billingCycle, promoCode) => {
  const plans = {
    free: {
      planName: 'Free Plan',
      planDescription: 'Basic features for getting started',
      pricing: { amount: 0, currency: 'INR', billingCycle, discount: 0 },
      features: {
        maxTrips: 5, maxEvents: 2, maxPosts: 10, maxFriends: 50,
        maxStorage: 100, advancedAnalytics: false, prioritySupport: false,
        customBranding: false, apiAccess: false, whiteLabel: false
      }
    },
    basic: {
      planName: 'Basic Plan',
      planDescription: 'Perfect for regular riders',
      pricing: { amount: 299, currency: 'INR', billingCycle, discount: 0 },
      features: {
        maxTrips: 25, maxEvents: 10, maxPosts: 50, maxFriends: 200,
        maxStorage: 500, advancedAnalytics: false, prioritySupport: false,
        customBranding: false, apiAccess: false, whiteLabel: false
      }
    },
    premium: {
      planName: 'Premium Plan',
      planDescription: 'Advanced features for enthusiasts',
      pricing: { amount: 599, currency: 'INR', billingCycle, discount: 0 },
      features: {
        maxTrips: 100, maxEvents: 50, maxPosts: 200, maxFriends: 500,
        maxStorage: 2000, advancedAnalytics: true, prioritySupport: true,
        customBranding: false, apiAccess: false, whiteLabel: false
      }
    },
    pro: {
      planName: 'Pro Plan',
      planDescription: 'Professional features for groups',
      pricing: { amount: 1299, currency: 'INR', billingCycle, discount: 0 },
      features: {
        maxTrips: 500, maxEvents: 200, maxPosts: 1000, maxFriends: 1000,
        maxStorage: 10000, advancedAnalytics: true, prioritySupport: true,
        customBranding: true, apiAccess: true, whiteLabel: false
      }
    },
    enterprise: {
      planName: 'Enterprise Plan',
      planDescription: 'Complete solution for organizations',
      pricing: { amount: 2999, currency: 'INR', billingCycle, discount: 0 },
      features: {
        maxTrips: -1, maxEvents: -1, maxPosts: -1, maxFriends: -1,
        maxStorage: -1, advancedAnalytics: true, prioritySupport: true,
        customBranding: true, apiAccess: true, whiteLabel: true
      }
    }
  };

  const planData = plans[plan];
  
  // Apply promo code discount if provided
  if (promoCode) {
    // In real implementation, you would validate promo code here
    const discount = 10; // 10% discount for demo
    planData.pricing.discount = discount;
  }

  // Set subscription dates
  const startDate = new Date();
  const endDate = new Date();
  
  switch (billingCycle) {
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case 'quarterly':
      endDate.setMonth(endDate.getMonth() + 3);
      break;
    case 'yearly':
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
    case 'lifetime':
      endDate.setFullYear(endDate.getFullYear() + 100);
      break;
  }

  return {
    ...planData,
    startDate,
    endDate,
    status: 'active'
  };
};
