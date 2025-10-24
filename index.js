// server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";

import socketAuth from "./middleware/socketAuth.js";
import { handleConnection } from "./socket/socketHandlers.js";
import { setSocketInstance } from "./utils/socket.js";

import authRoutes from "./routes/authRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import feedRoutes from "./routes/feedRoutes.js";
import postsRoutes from "./routes/postsRoutes.js";
import trackingRoutes from "./routes/trackingRoutes.js";
import nearbyRoutes from "./routes/nearbyRoutes.js";
import friendsRoutes from "./routes/friendsRoutes.js";
import notificationsRoutes from "./routes/notificationsRoutes.js";
import achievementsRoutes from "./routes/achievementsRoutes.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import eventsRoutes from "./routes/eventsRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
console.log("Environment loaded:", process.env.MONGO_URI ? "✅ OK" : "❌ Missing");
console.log("JWT Secret loaded:", process.env.JWT_SECRET ? "✅ OK" : "❌ Missing");

connectDB();

const app = express();
const server = createServer(app);

// Socket.io configuration
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket.io authentication middleware
io.use(socketAuth);

// Socket.io connection handler
io.on('connection', (socket) => {
  handleConnection(io, socket);
});

// Set Socket.io instance for use in other modules
setSocketInstance(io);
app.use(cors());
app.use(express.json()); // parse JSON bodies

app.get("/", (req, res) => res.send("Rider App Backend Running 🚴‍♂️"));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/trips", tripRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/feed", feedRoutes);
app.use("/api/v1/posts", postsRoutes);
app.use("/api/v1/track", trackingRoutes);
app.use("/api/v1/nearby", nearbyRoutes);
app.use("/api/v1/friends", friendsRoutes);
app.use("/api/v1/notifications", notificationsRoutes);
app.use("/api/v1/achievements", achievementsRoutes);
app.use("/api/v1/media", mediaRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/events", eventsRoutes);
app.use("/api/v1/service", serviceRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/subscription", subscriptionRoutes);
app.use("/api/v1/analytics", analyticsRoutes);

// example protected route
import { protect } from "./middleware/authMiddleware.js";
app.get("/api/v1/me", protect, (req, res) => {
  res.json({ user: req.user });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io server ready for connections`);
});
