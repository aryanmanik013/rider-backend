// scripts/seedAchievements.js
import mongoose from "mongoose";
import Achievement from "../models/Achievement.js";
import dotenv from "dotenv";

dotenv.config();

const achievements = [
  // Distance achievements
  {
    name: "First Mile",
    description: "Complete your first mile on a ride",
    category: "distance",
    type: "single",
    rarity: "common",
    requirements: { distance: 1 },
    rewards: { points: 10, badge: { name: "First Mile", icon: "🏁", color: "#4CAF50" } },
    icon: "🏁",
    color: "#4CAF50",
    tags: ["distance", "beginner"]
  },
  {
    name: "Century Rider",
    description: "Complete 100 miles in total",
    category: "distance",
    type: "single",
    rarity: "uncommon",
    requirements: { distance: 100 },
    rewards: { points: 100, badge: { name: "Century Rider", icon: "💯", color: "#FF9800" } },
    icon: "💯",
    color: "#FF9800",
    tags: ["distance", "milestone"]
  },
  {
    name: "Thousand Mile Club",
    description: "Complete 1000 miles in total",
    category: "distance",
    type: "single",
    rarity: "rare",
    requirements: { distance: 1000 },
    rewards: { points: 500, badge: { name: "Thousand Mile Club", icon: "🏆", color: "#9C27B0" } },
    icon: "🏆",
    color: "#9C27B0",
    tags: ["distance", "milestone"]
  },

  // Speed achievements
  {
    name: "Speed Demon",
    description: "Reach 100 km/h on a ride",
    category: "speed",
    type: "single",
    rarity: "uncommon",
    requirements: { speed: 100 },
    rewards: { points: 50, badge: { name: "Speed Demon", icon: "⚡", color: "#F44336" } },
    icon: "⚡",
    color: "#F44336",
    tags: ["speed", "thrill"]
  },
  {
    name: "Lightning Fast",
    description: "Reach 150 km/h on a ride",
    category: "speed",
    type: "single",
    rarity: "rare",
    requirements: { speed: 150 },
    rewards: { points: 200, badge: { name: "Lightning Fast", icon: "⚡", color: "#FF5722" } },
    icon: "⚡",
    color: "#FF5722",
    tags: ["speed", "extreme"]
  },

  // Trip achievements
  {
    name: "Trip Organizer",
    description: "Organize your first trip",
    category: "trips",
    type: "single",
    rarity: "common",
    requirements: { trips: 1 },
    rewards: { points: 25, badge: { name: "Trip Organizer", icon: "🗺️", color: "#2196F3" } },
    icon: "🗺️",
    color: "#2196F3",
    tags: ["trips", "leadership"]
  },
  {
    name: "Group Leader",
    description: "Organize 10 trips",
    category: "trips",
    type: "single",
    rarity: "uncommon",
    requirements: { trips: 10 },
    rewards: { points: 150, badge: { name: "Group Leader", icon: "👑", color: "#FF9800" } },
    icon: "👑",
    color: "#FF9800",
    tags: ["trips", "leadership"]
  },

  // Social achievements
  {
    name: "Social Butterfly",
    description: "Make 10 friends",
    category: "social",
    type: "single",
    rarity: "uncommon",
    requirements: { friends: 10 },
    rewards: { points: 75, badge: { name: "Social Butterfly", icon: "🦋", color: "#E91E63" } },
    icon: "🦋",
    color: "#E91E63",
    tags: ["social", "friends"]
  },
  {
    name: "Community Builder",
    description: "Make 50 friends",
    category: "social",
    type: "single",
    rarity: "rare",
    requirements: { friends: 50 },
    rewards: { points: 300, badge: { name: "Community Builder", icon: "🏘️", color: "#9C27B0" } },
    icon: "🏘️",
    color: "#9C27B0",
    tags: ["social", "community"]
  },

  // Post achievements
  {
    name: "Storyteller",
    description: "Create your first post",
    category: "posts",
    type: "single",
    rarity: "common",
    requirements: { posts: 1 },
    rewards: { points: 15, badge: { name: "Storyteller", icon: "📝", color: "#4CAF50" } },
    icon: "📝",
    color: "#4CAF50",
    tags: ["posts", "content"]
  },
  {
    name: "Content Creator",
    description: "Create 25 posts",
    category: "posts",
    type: "single",
    rarity: "uncommon",
    requirements: { posts: 25 },
    rewards: { points: 100, badge: { name: "Content Creator", icon: "📸", color: "#FF9800" } },
    icon: "📸",
    color: "#FF9800",
    tags: ["posts", "content"]
  },

  // Safety achievements
  {
    name: "Safety First",
    description: "Complete 10 rides without any incidents",
    category: "safety",
    type: "single",
    rarity: "uncommon",
    requirements: { trips: 10 },
    rewards: { points: 50, badge: { name: "Safety First", icon: "🛡️", color: "#4CAF50" } },
    icon: "🛡️",
    color: "#4CAF50",
    tags: ["safety", "responsible"]
  },

  // Exploration achievements
  {
    name: "Explorer",
    description: "Visit 5 different cities",
    category: "exploration",
    type: "single",
    rarity: "uncommon",
    requirements: { locations: [
      { name: "Delhi", lat: 28.6139, lng: 77.2090, radius: 50 },
      { name: "Mumbai", lat: 19.0760, lng: 72.8777, radius: 50 },
      { name: "Bangalore", lat: 12.9716, lng: 77.5946, radius: 50 },
      { name: "Chennai", lat: 13.0827, lng: 80.2707, radius: 50 },
      { name: "Kolkata", lat: 22.5726, lng: 88.3639, radius: 50 }
    ]},
    rewards: { points: 200, badge: { name: "Explorer", icon: "🗺️", color: "#2196F3" } },
    icon: "🗺️",
    color: "#2196F3",
    tags: ["exploration", "travel"]
  },

  // Special achievements
  {
    name: "Early Bird",
    description: "Complete a ride before 6 AM",
    category: "special",
    type: "single",
    rarity: "uncommon",
    requirements: { customConditions: { earlyMorning: true } },
    rewards: { points: 30, badge: { name: "Early Bird", icon: "🌅", color: "#FF9800" } },
    icon: "🌅",
    color: "#FF9800",
    tags: ["special", "time"]
  },
  {
    name: "Night Rider",
    description: "Complete a ride after 10 PM",
    category: "special",
    type: "single",
    rarity: "uncommon",
    requirements: { customConditions: { lateNight: true } },
    rewards: { points: 30, badge: { name: "Night Rider", icon: "🌙", color: "#673AB7" } },
    icon: "🌙",
    color: "#673AB7",
    tags: ["special", "time"]
  }
];

const seedAchievements = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Clear existing achievements
    await Achievement.deleteMany({});
    console.log("Cleared existing achievements");

    // Insert new achievements
    const createdAchievements = await Achievement.insertMany(achievements);
    console.log(`Created ${createdAchievements.length} achievements`);

    console.log("Achievement seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding achievements:", error);
    process.exit(1);
  }
};

seedAchievements();
