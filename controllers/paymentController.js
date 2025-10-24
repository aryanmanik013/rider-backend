// controllers/paymentController.js
import Payment from "../models/Payment.js";
import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import crypto from "crypto";

// Razorpay configuration (you'll need to install razorpay: npm install razorpay)
// import Razorpay from "razorpay";

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// Create payment order
export const createPayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      amount,
      currency = 'INR',
      purpose,
      description,
      relatedEntity,
      method = 'card'
    } = req.body;

    // Validate required fields
    if (!amount || !purpose || !description) {
      return res.status(400).json({
        message: "Amount, purpose, and description are required"
      });
    }

    // Validate amount
    if (amount < 1) {
      return res.status(400).json({
        message: "Amount must be greater than 0"
      });
    }

    // Generate unique payment ID
    const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create payment record
    const payment = new Payment({
      user: userId,
      paymentId,
      orderId,
      amount,
      currency,
      method,
      purpose,
      description,
      relatedEntity,
      status: 'pending'
    });

    await payment.save();

    // In a real implementation, you would create a Razorpay order here
    // const razorpayOrder = await razorpay.orders.create({
    //   amount: amount * 100, // Razorpay expects amount in paise
    //   currency: currency,
    //   receipt: orderId,
    //   notes: {
    //     paymentId: paymentId,
    //     userId: userId.toString(),
    //     purpose: purpose
    //   }
    // });

    // For now, we'll simulate the Razorpay order creation
    const razorpayOrder = {
      id: `order_${Date.now()}`,
      amount: amount * 100,
      currency: currency,
      receipt: orderId,
      status: 'created',
      created_at: Date.now()
    };

    // Update payment with Razorpay order details
    payment.metadata.razorpayOrderId = razorpayOrder.id;
    await payment.save();

    res.status(201).json({
      message: "Payment order created successfully",
      payment: {
        _id: payment._id,
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        purpose: payment.purpose,
        description: payment.description,
        status: payment.status,
        razorpayOrder: razorpayOrder,
        createdAt: payment.createdAt
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Verify payment
export const verifyPayment = async (req, res) => {
  try {
    const { paymentId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!paymentId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        message: "Payment ID, Razorpay Payment ID, and signature are required"
      });
    }

    const payment = await Payment.findOne({ paymentId });
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Verify signature (in real implementation)
    // const expectedSignature = crypto
    //   .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    //   .update(`${payment.metadata.razorpayOrderId}|${razorpayPaymentId}`)
    //   .digest('hex');

    // if (expectedSignature !== razorpaySignature) {
    //   return res.status(400).json({ message: "Invalid signature" });
    // }

    // For now, we'll simulate successful verification
    const isSignatureValid = true;

    if (isSignatureValid) {
      // Mark payment as completed
      await payment.markAsCompleted(razorpayPaymentId, razorpaySignature);

      // Handle payment completion based on purpose
      await handlePaymentCompletion(payment);

      res.json({
        message: "Payment verified successfully",
        payment: {
          _id: payment._id,
          paymentId: payment.paymentId,
          status: payment.status,
          amount: payment.amount,
          purpose: payment.purpose,
          completedAt: payment.completedAt
        }
      });
    } else {
      await payment.markAsFailed("Invalid signature");
      res.status(400).json({ message: "Payment verification failed" });
    }

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get payment history
export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      page = 1,
      limit = 20,
      status,
      purpose,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const options = {
      status,
      purpose,
      startDate,
      endDate,
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    const payments = await Payment.findByUser(userId, options);
    const totalPayments = await Payment.countDocuments({ user: userId });

    res.json({
      payments: payments.map(payment => ({
        _id: payment._id,
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        purpose: payment.purpose,
        description: payment.description,
        status: payment.status,
        relatedEntity: payment.relatedEntity,
        fees: payment.fees,
        receipt: payment.receipt,
        initiatedAt: payment.initiatedAt,
        completedAt: payment.completedAt,
        failedAt: payment.failedAt,
        refundedAt: payment.refundedAt,
        createdAt: payment.createdAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPayments / parseInt(limit)),
        totalPayments,
        hasMore: (parseInt(page) - 1) * parseInt(limit) + payments.length < totalPayments
      },
      filters: {
        status,
        purpose,
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

// Get payment by ID
export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const payment = await Payment.findOne({ _id: id, user: userId });
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.json({
      payment: {
        _id: payment._id,
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        purpose: payment.purpose,
        description: payment.description,
        status: payment.status,
        relatedEntity: payment.relatedEntity,
        metadata: payment.metadata,
        fees: payment.fees,
        receipt: payment.receipt,
        notes: payment.notes,
        tags: payment.tags,
        initiatedAt: payment.initiatedAt,
        completedAt: payment.completedAt,
        failedAt: payment.failedAt,
        refundedAt: payment.refundedAt,
        createdAt: payment.createdAt
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Process refund
export const processRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { refundAmount, reason } = req.body;

    const payment = await Payment.findOne({ _id: id, user: userId });
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status !== 'captured') {
      return res.status(400).json({ message: "Only captured payments can be refunded" });
    }

    const refundAmountToProcess = refundAmount || payment.amount;
    
    if (refundAmountToProcess > payment.amount) {
      return res.status(400).json({ message: "Refund amount cannot exceed payment amount" });
    }

    // In real implementation, you would process refund with Razorpay
    // const refund = await razorpay.payments.refund(payment.metadata.razorpayPaymentId, {
    //   amount: refundAmountToProcess * 100,
    //   notes: {
    //     reason: reason || 'Refund requested by user'
    //   }
    // });

    // For now, we'll simulate refund processing
    const refundId = `refund_${Date.now()}`;

    await payment.processRefund(refundId, refundAmountToProcess, reason);

    res.json({
      message: "Refund processed successfully",
      refund: {
        refundId,
        refundAmount: refundAmountToProcess,
        reason,
        processedAt: payment.refundedAt
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get payment statistics
export const getPaymentStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await Payment.getPaymentStats(userId);

    if (stats.length === 0) {
      return res.json({
        totalPayments: 0,
        totalAmount: 0,
        successfulPayments: 0,
        failedPayments: 0,
        refundedPayments: 0,
        totalRefunded: 0,
        byPurpose: {},
        byMethod: {}
      });
    }

    const userStats = stats[0];
    
    // Process purpose breakdown
    const byPurpose = {};
    userStats.byPurpose.forEach(item => {
      byPurpose[item.purpose] = (byPurpose[item.purpose] || 0) + 1;
    });

    // Process method breakdown
    const byMethod = {};
    userStats.byMethod.forEach(item => {
      byMethod[item.method] = (byMethod[item.method] || 0) + 1;
    });

    res.json({
      totalPayments: userStats.totalPayments,
      totalAmount: userStats.totalAmount,
      successfulPayments: userStats.successfulPayments,
      failedPayments: userStats.failedPayments,
      refundedPayments: userStats.refundedPayments,
      totalRefunded: userStats.totalRefunded,
      byPurpose,
      byMethod
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper function to handle payment completion
const handlePaymentCompletion = async (payment) => {
  try {
    switch (payment.purpose) {
      case 'subscription':
        await handleSubscriptionPayment(payment);
        break;
      case 'event_registration':
        await handleEventRegistrationPayment(payment);
        break;
      case 'service_payment':
        await handleServicePayment(payment);
        break;
      default:
        console.log(`Payment completed for purpose: ${payment.purpose}`);
    }

    // Create notification for successful payment
    await Notification.create({
      recipient: payment.user,
      title: "Payment Successful",
      message: `Your payment of ₹${payment.amount} for ${payment.description} has been processed successfully.`,
      type: 'payment_success',
      relatedEntity: {
        type: 'payment',
        id: payment._id
      }
    });

  } catch (error) {
    console.error("Error handling payment completion:", error);
  }
};

// Handle subscription payment
const handleSubscriptionPayment = async (payment) => {
  const subscription = await Subscription.findById(payment.relatedEntity.id);
  if (subscription) {
    await subscription.renew(payment._id);
  }
};

// Handle event registration payment
const handleEventRegistrationPayment = async (payment) => {
  // Update event registration status
  // This would integrate with your event system
  console.log(`Event registration payment processed: ${payment.relatedEntity.id}`);
};

// Handle service payment
const handleServicePayment = async (payment) => {
  // Update service payment status
  // This would integrate with your service system
  console.log(`Service payment processed: ${payment.relatedEntity.id}`);
};
