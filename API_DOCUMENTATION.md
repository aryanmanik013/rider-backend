# Rider App Backend API Documentation

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication
Most endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Authentication APIs

### 1. Register User
**POST** `/auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "password123",
  "phone": "9876543210"
}
```

```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "671a0f1234567890abcdef12",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "9876543210",
    "phoneVerified": false,
    "isIncomplete": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Login User
**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "671a0f1234567890abcdef12",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "9876543210",
    "phoneVerified": false,
    "bikes": [],
    "totalTrips": 0,
    "location": null
  }
}
```

### 3. Send OTP
**POST** `/auth/send-otp`

**Request Body:**
```json
{
  "phone": "9876543210"
}
```

```json
{
  "message": "OTP sent successfully",
  "phone": "9876543210"
}
```

### 4. Verify OTP
**POST** `/auth/verify-otp`

**Request Body:**
```json
{
  "phone": "9876543210",
  "otp": "1234"
}
```

```json
{
  "message": "OTP verified successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "671a0f1234567890abcdef12",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "9876543210",
    "phoneVerified": true,
    "bikes": [],
    "totalTrips": 0,
    "location": null
  }
}
```

---

## 👤 User Profile APIs

### 5. Get User Profile
**GET** `/user/profile`

```json
{
  "user": {
    "_id": "671a0f1234567890abcdef12",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "9876543210",
    "phoneVerified": true,
    "bio": "Passionate rider exploring the world on two wheels",
    "avatar": "https://cloudinary.com/image/upload/v1234567890/avatar.jpg",
    "bikes": [
      {
        "brand": "Royal Enfield",
        "model": "Classic 350",
        "numberPlate": "DL01AB1234",
        "color": "Red"
      }
    ],
    "totalTrips": 15,
    "location": "Delhi, India",
    "friends": [],
    "achievements": {
      "totalPoints": 250,
      "level": 3,
      "unlockedCount": 8
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 6. Update User Profile
**PUT** `/user/profile`

**Request Body:**
```json
{
  "bio": "Updated bio - Love long rides and adventure",
  "location": "Mumbai, India",
  "bikes": [
    {
      "brand": "Royal Enfield",
      "model": "Classic 350",
      "numberPlate": "DL01AB1234",
      "color": "Red"
    },
    {
      "brand": "Yamaha",
      "model": "MT-15",
      "numberPlate": "MH02CD5678",
      "color": "Blue"
    }
  ]
}
```

```json
{
  "message": "Profile updated successfully",
  "user": {
    "_id": "671a0f1234567890abcdef12",
    "bio": "Updated bio - Love long rides and adventure",
    "location": "Mumbai, India",
    "bikes": [
      {
        "brand": "Royal Enfield",
        "model": "Classic 350",
        "numberPlate": "DL01AB1234",
        "color": "Red"
      },
      {
        "brand": "Yamaha",
        "model": "MT-15",
        "numberPlate": "MH02CD5678",
        "color": "Blue"
      }
    ]
  }
}
```

### 7. Get Public User Profile
**GET** `/user/{userId}`

```json
{
  "user": {
    "_id": "671a0f1234567890abcdef12",
    "name": "John Doe",
    "avatar": "https://cloudinary.com/image/upload/v1234567890/avatar.jpg",
    "bio": "Passionate rider exploring the world on two wheels",
    "location": "Mumbai, India",
    "bikes": [
      {
        "brand": "Royal Enfield",
        "model": "Classic 350",
        "color": "Red"
      }
    ],
    "totalTrips": 15,
    "friendsCount": 25,
    "isFriend": false,
    "joinedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 🗺️ Trip Management APIs

### 8. Create Trip
**POST** `/trips`

**Request Body:**
```json
{
  "title": "Weekend Ride to Mussoorie",
  "description": "A beautiful weekend ride to the hills of Mussoorie",
  "waypoints": [
    {
      "lat": 28.6139,
      "lng": 77.2090,
      "name": "Delhi",
      "order": 1
    },
    {
      "lat": 30.4500,
      "lng": 78.0700,
      "name": "Mussoorie",
      "order": 2
    }
  ],
  "stops": [
    {
      "name": "Dehradun",
      "lat": 30.3165,
      "lng": 78.0322,
      "order": 1
    }
  ],
  "scheduledDate": "2024-02-15T08:00:00.000Z",
  "difficulty": "moderate",
  "tripType": "weekend",
  "maxParticipants": 10,
  "visibility": "public",
  "notes": "Bring warm clothes and rain gear"
}
```

```json
{
  "message": "Trip created successfully",
  "trip": {
    "_id": "671a0f1234567890abcdef13",
    "title": "Weekend Ride to Mussoorie",
    "description": "A beautiful weekend ride to the hills of Mussoorie",
    "organizer": {
      "_id": "671a0f1234567890abcdef12",
      "name": "John Doe",
      "avatar": "https://cloudinary.com/image/upload/v1234567890/avatar.jpg"
    },
    "waypoints": [
      {
        "lat": 28.6139,
        "lng": 77.2090,
        "name": "Delhi",
        "order": 1
      },
      {
        "lat": 30.4500,
        "lng": 78.0700,
        "name": "Mussoorie",
        "order": 2
      }
    ],
    "stops": [
      {
        "name": "Dehradun",
        "lat": 30.3165,
        "lng": 78.0322,
        "order": 1
      }
    ],
    "scheduledDate": "2024-02-15T08:00:00.000Z",
    "difficulty": "moderate",
    "tripType": "weekend",
    "maxParticipants": 10,
    "visibility": "public",
    "status": "planned",
    "participants": [],
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 9. Get Trips
**GET** `/trips?page=1&limit=10&status=planned&difficulty=moderate`

```json
{
  "trips": [
    {
      "_id": "671a0f1234567890abcdef13",
      "title": "Weekend Ride to Mussoorie",
      "description": "A beautiful weekend ride to the hills of Mussoorie",
      "organizer": {
        "_id": "671a0f1234567890abcdef12",
        "name": "John Doe",
        "avatar": "https://cloudinary.com/image/upload/v1234567890/avatar.jpg"
      },
      "scheduledDate": "2024-02-15T08:00:00.000Z",
      "difficulty": "moderate",
      "tripType": "weekend",
      "maxParticipants": 10,
      "participantsCount": 3,
      "isJoined": false,
      "visibility": "public",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalTrips": 50,
    "hasMore": true
  }
}
```

### 10. Join Trip
**POST** `/trips/{tripId}/join`

```json
{
  "message": "Successfully joined the trip",
  "trip": {
    "_id": "671a0f1234567890abcdef13",
    "title": "Weekend Ride to Mussoorie",
    "participantsCount": 4,
    "isJoined": true
  }
}
```

---

## 📝 Posts & Feed APIs

### 11. Create Post
**POST** `/posts`

**Request Body:**
```json
{
  "title": "Amazing Ride to Rishikesh",
  "content": "Just completed an incredible ride to Rishikesh! The roads were amazing and the views were breathtaking. Highly recommend this route for fellow riders.",
  "type": "ride",
  "media": [
    "https://cloudinary.com/image/upload/v1234567890/ride1.jpg",
    "https://cloudinary.com/image/upload/v1234567890/ride2.jpg"
  ],
  "location": {
    "name": "Rishikesh",
    "lat": 30.0869,
    "lng": 78.2676
  },
  "tags": ["adventure", "weekend", "mountains"],
  "visibility": "public"
}
```

```json
{
  "message": "Post created successfully",
  "post": {
    "_id": "671a0f1234567890abcdef14",
    "title": "Amazing Ride to Rishikesh",
    "content": "Just completed an incredible ride to Rishikesh! The roads were amazing and the views were breathtaking. Highly recommend this route for fellow riders.",
    "type": "ride",
    "author": {
      "_id": "671a0f1234567890abcdef12",
      "name": "John Doe",
      "avatar": "https://cloudinary.com/image/upload/v1234567890/avatar.jpg"
    },
    "media": [
      "https://cloudinary.com/image/upload/v1234567890/ride1.jpg",
      "https://cloudinary.com/image/upload/v1234567890/ride2.jpg"
    ],
    "location": {
      "name": "Rishikesh",
      "lat": 30.0869,
      "lng": 78.2676
    },
    "tags": ["adventure", "weekend", "mountains"],
    "likesCount": 0,
    "commentsCount": 0,
    "visibility": "public",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 12. Get Feed
**GET** `/feed?page=1&limit=10&type=ride&location=delhi`

```json
{
  "posts": [
    {
      "_id": "671a0f1234567890abcdef14",
      "title": "Amazing Ride to Rishikesh",
      "content": "Just completed an incredible ride to Rishikesh! The roads were amazing and the views were breathtaking.",
      "type": "ride",
      "author": {
        "_id": "671a0f1234567890abcdef12",
        "name": "John Doe",
        "avatar": "https://cloudinary.com/image/upload/v1234567890/avatar.jpg"
      },
      "media": [
        "https://cloudinary.com/image/upload/v1234567890/ride1.jpg"
      ],
      "location": {
        "name": "Rishikesh",
        "lat": 30.0869,
        "lng": 78.2676
      },
      "tags": ["adventure", "weekend", "mountains"],
      "likesCount": 15,
      "commentsCount": 3,
      "isLiked": false,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 20,
    "totalPosts": 200,
    "hasMore": true
  }
}
```

### 13. Like Post
**POST** `/posts/{postId}/like`

```json
{
  "message": "Post liked successfully",
  "post": {
    "_id": "671a0f1234567890abcdef14",
    "likesCount": 16,
    "isLiked": true
  }
}
```

---

## 🚗 Ride Tracking APIs

### 14. Start Tracking Session
**POST** `/track/start`

**Request Body:**
```json
{
  "tripId": "671a0f1234567890abcdef13",
  "startedAt": "2024-01-15T10:00:00.000Z",
  "startLocation": {
    "name": "Delhi",
    "lat": 28.6139,
    "lng": 77.2090,
    "address": "Connaught Place, New Delhi"
  }
}
```

```json
{
  "message": "Tracking session started successfully",
  "session": {
    "_id": "671a0f1234567890abcdef15",
    "sessionId": "TRK_1705312800000_abc123def",
    "trip": "671a0f1234567890abcdef13",
    "rider": "671a0f1234567890abcdef12",
    "status": "active",
    "startedAt": "2024-01-15T10:00:00.000Z",
    "startLocation": {
      "name": "Delhi",
      "lat": 28.6139,
      "lng": 77.2090,
      "address": "Connaught Place, New Delhi"
    },
    "routePoints": [],
    "totalDistance": 0,
    "totalDuration": 0,
    "maxSpeed": 0,
    "averageSpeed": 0
  }
}
```

### 15. Send Location Point
**POST** `/track/point`

**Request Body:**
```json
{
  "sessionId": "TRK_1705312800000_abc123def",
  "lat": 28.6140,
  "lng": 77.2091,
  "timestamp": "2024-01-15T10:05:00.000Z",
  "speed": 25.5,
  "heading": 90,
  "accuracy": 10
}
```

```json
{
  "message": "Location point recorded successfully",
  "session": {
    "_id": "671a0f1234567890abcdef15",
    "totalDistance": 1.2,
    "totalDuration": 5,
    "maxSpeed": 25.5,
    "averageSpeed": 14.4,
    "routePointsCount": 1
  }
}
```

### 16. Stop Tracking Session
**POST** `/track/stop`

**Request Body:**
```json
{
  "sessionId": "TRK_1705312800000_abc123def",
  "endedAt": "2024-01-15T12:00:00.000Z",
  "endLocation": {
    "name": "Mussoorie",
    "lat": 30.4500,
    "lng": 78.0700,
    "address": "Mussoorie, Uttarakhand"
  },
  "notes": "Great ride! Weather was perfect."
}
```

```json
{
  "message": "Tracking session completed successfully",
  "session": {
    "_id": "671a0f1234567890abcdef15",
    "status": "completed",
    "endedAt": "2024-01-15T12:00:00.000Z",
    "endLocation": {
      "name": "Mussoorie",
      "lat": 30.4500,
      "lng": 78.0700,
      "address": "Mussoorie, Uttarakhand"
    },
    "totalDistance": 250.5,
    "totalDuration": 120,
    "maxSpeed": 85.2,
    "averageSpeed": 45.8,
    "routePointsCount": 120,
    "notes": "Great ride! Weather was perfect."
  }
}
```

---

## 👥 Friends System APIs

### 17. Send Friend Request
**POST** `/friends/request`

**Request Body:**
```json
{
  "userId": "671a0f1234567890abcdef16"
}
```

```json
{
  "message": "Friend request sent successfully",
  "request": {
    "from": "671a0f1234567890abcdef12",
    "to": "671a0f1234567890abcdef16",
    "status": "pending",
    "sentAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 18. Accept Friend Request
**POST** `/friends/accept/{requestId}`

```json
{
  "message": "Friend request accepted successfully",
  "friendship": {
    "user1": "671a0f1234567890abcdef12",
    "user2": "671a0f1234567890abcdef16",
    "addedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 19. Get Friends List
**GET** `/friends?page=1&limit=20`

```json
{
  "friends": [
    {
      "_id": "671a0f1234567890abcdef16",
      "name": "Jane Smith",
      "avatar": "https://cloudinary.com/image/upload/v1234567890/jane_avatar.jpg",
      "location": "Mumbai, India",
      "totalTrips": 25,
      "addedAt": "2024-01-10T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalFriends": 25,
    "hasMore": true
  }
}
```

---

## 🔔 Notifications APIs

### 20. Get Notifications
**GET** `/notifications?page=1&limit=20&status=unread`

```json
{
  "notifications": [
    {
      "_id": "671a0f1234567890abcdef17",
      "sender": {
        "_id": "671a0f1234567890abcdef16",
        "name": "Jane Smith",
        "avatar": "https://cloudinary.com/image/upload/v1234567890/jane_avatar.jpg"
      },
      "title": "New Friend Request",
      "message": "Jane Smith sent you a friend request",
      "type": "friend_request",
      "priority": "medium",
      "status": "unread",
      "relatedEntity": {
        "type": "user",
        "id": "671a0f1234567890abcdef16"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalNotifications": 50,
    "unreadCount": 12
  }
}
```

### 21. Mark Notification as Read
**POST** `/notifications/mark-read/{notificationId}`

```json
{
  "message": "Notification marked as read",
  "notification": {
    "_id": "671a0f1234567890abcdef17",
    "status": "read",
    "readAt": "2024-01-15T10:35:00.000Z"
  }
}
```

---

## 🏆 Achievements APIs

### 22. Get Achievements
**GET** `/achievements?category=distance&rarity=common`

```json
{
  "achievements": [
    {
      "_id": "671a0f1234567890abcdef18",
      "name": "First Mile",
      "description": "Complete your first mile on a ride",
      "category": "distance",
      "type": "single",
      "rarity": "common",
      "requirements": {
        "distance": 1
      },
      "rewards": {
        "points": 10,
        "badge": {
          "name": "First Mile",
          "icon": "🏁",
          "color": "#4CAF50"
        }
      },
      "icon": "🏁",
      "color": "#4CAF50",
      "isUnlocked": true,
      "unlockedAt": "2024-01-10T10:30:00.000Z",
      "progress": 100
    }
  ],
  "totalAchievements": 15,
  "unlockedCount": 8,
  "categories": ["distance", "speed", "trips", "social"],
  "rarities": ["common", "uncommon", "rare", "epic"]
}
```

### 23. Unlock Achievement
**POST** `/achievements/unlock/{achievementId}`

```json
{
  "message": "Achievement unlocked successfully!",
  "achievement": {
    "_id": "671a0f1234567890abcdef18",
    "name": "First Mile",
    "description": "Complete your first mile on a ride",
    "category": "distance",
    "rarity": "common",
    "rewards": {
      "points": 10,
      "badge": {
        "name": "First Mile",
        "icon": "🏁",
        "color": "#4CAF50"
      }
    }
  },
  "userStats": {
    "totalPoints": 260,
    "level": 3,
    "experience": 260,
    "unlockedCount": 9
  }
}
```

---

## 📸 Media APIs

### 24. Upload Media
**POST** `/media/upload`

**Request Body:** (multipart/form-data)
```
file: [image/video file]
category: "post_image"
description: "Ride photos from Mussoorie trip"
tags: "adventure,weekend,mountains"
```

```json
{
  "message": "File uploaded successfully",
  "media": {
    "_id": "671a0f1234567890abcdef19",
    "filename": "671a0f1234567890abcdef12_1705312800000",
    "originalName": "mussoorie_ride.jpg",
    "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/mussoorie_ride.jpg",
    "fileType": "image",
    "category": "post_image",
    "size": 2048576,
    "width": 1920,
    "height": 1080,
    "description": "Ride photos from Mussoorie trip",
    "tags": ["adventure", "weekend", "mountains"],
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 25. Get User Media
**GET** `/media/user/{userId}?page=1&limit=20&category=post_image`

```json
{
  "media": [
    {
      "_id": "671a0f1234567890abcdef19",
      "filename": "671a0f1234567890abcdef12_1705312800000",
      "originalName": "mussoorie_ride.jpg",
      "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/mussoorie_ride.jpg",
      "fileType": "image",
      "category": "post_image",
      "size": 2048576,
      "width": 1920,
      "height": 1080,
      "description": "Ride photos from Mussoorie trip",
      "tags": ["adventure", "weekend", "mountains"],
      "views": 25,
      "downloads": 3,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalMedia": 50,
    "hasMore": true
  },
  "user": {
    "_id": "671a0f1234567890abcdef12",
    "name": "John Doe",
    "avatar": "https://cloudinary.com/image/upload/v1234567890/avatar.jpg"
  }
}
```

---

## 🔍 Search APIs

### 26. Search Users
**GET** `/search/users?q=john&location=delhi&bikeBrand=royal%20enfield&sortBy=trips`

```json
{
  "users": [
    {
      "_id": "671a0f1234567890abcdef12",
      "name": "John Doe",
      "avatar": "https://cloudinary.com/image/upload/v1234567890/avatar.jpg",
      "bio": "Passionate rider exploring the world on two wheels",
      "location": "Delhi, India",
      "bikes": [
        {
          "brand": "Royal Enfield",
          "model": "Classic 350",
          "color": "Red"
        }
      ],
      "totalTrips": 15,
      "friendsCount": 25,
      "isFriend": false,
      "joinedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalUsers": 25,
    "hasMore": true
  },
  "filters": {
    "query": "john",
    "location": "delhi",
    "bikeBrand": "royal enfield",
    "sortBy": "trips"
  }
}
```

### 27. Search Trips
**GET** `/search/trips?q=mussoorie&difficulty=moderate&startDate=2024-02-01&endDate=2024-02-28`

```json
{
  "trips": [
    {
      "_id": "671a0f1234567890abcdef13",
      "title": "Weekend Ride to Mussoorie",
      "description": "A beautiful weekend ride to the hills of Mussoorie",
      "organizer": {
        "_id": "671a0f1234567890abcdef12",
        "name": "John Doe",
        "avatar": "https://cloudinary.com/image/upload/v1234567890/avatar.jpg"
      },
      "scheduledDate": "2024-02-15T08:00:00.000Z",
      "difficulty": "moderate",
      "tripType": "weekend",
      "totalDistance": 250,
      "estimatedDuration": 120,
      "participants": [
        {
          "_id": "671a0f1234567890abcdef12",
          "name": "John Doe",
          "avatar": "https://cloudinary.com/image/upload/v1234567890/avatar.jpg",
          "status": "confirmed",
          "joinedAt": "2024-01-15T10:30:00.000Z"
        }
      ],
      "maxParticipants": 10,
      "isJoined": false,
      "visibility": "public",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalTrips": 15,
    "hasMore": true
  }
}
```

---

## 🎪 Event APIs

### 28. Create Event
**POST** `/events`

**Request Body:**
```json
{
  "title": "Charity Ride for Children",
  "description": "Join us for a charity ride to support children's education",
  "eventType": "charity_ride",
  "category": "charity",
  "startDate": "2024-02-15T08:00:00.000Z",
  "endDate": "2024-02-15T17:00:00.000Z",
  "registrationDeadline": "2024-02-10T23:59:59.000Z",
  "location": {
    "name": "Central Park",
    "address": "123 Park Street",
    "city": "Delhi",
    "state": "Delhi",
    "coordinates": {
      "lat": 28.6139,
      "lng": 77.2090
    }
  },
  "capacity": {
    "maxParticipants": 100,
    "waitlistEnabled": true,
    "maxWaitlist": 20
  },
  "pricing": {
    "isFree": true,
    "amount": 0,
    "currency": "INR"
  },
  "requirements": {
    "skillLevel": "beginner",
    "safetyGear": ["helmet", "gloves", "jacket"],
    "documents": ["license", "insurance"]
  },
  "tags": ["charity", "community", "children"]
}
```

```json
{
  "message": "Event created successfully",
  "event": {
    "_id": "671a0f1234567890abcdef20",
    "title": "Charity Ride for Children",
    "description": "Join us for a charity ride to support children's education",
    "eventType": "charity_ride",
    "category": "charity",
    "startDate": "2024-02-15T08:00:00.000Z",
    "endDate": "2024-02-15T17:00:00.000Z",
    "registrationDeadline": "2024-02-10T23:59:59.000Z",
    "location": {
      "name": "Central Park",
      "address": "123 Park Street",
      "city": "Delhi",
      "state": "Delhi",
      "coordinates": {
        "lat": 28.6139,
        "lng": 77.2090
      }
    },
    "capacity": {
      "maxParticipants": 100,
      "currentParticipants": 0,
      "waitlistEnabled": true,
      "maxWaitlist": 20
    },
    "pricing": {
      "isFree": true,
      "amount": 0,
      "currency": "INR"
    },
    "organizer": {
      "_id": "671a0f1234567890abcdef12",
      "name": "John Doe",
      "avatar": "https://cloudinary.com/image/upload/v1234567890/avatar.jpg"
    },
    "status": "draft",
    "visibility": "public",
    "tags": ["charity", "community", "children"],
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 29. Join Event
**POST** `/events/{eventId}/join`

```json
{
  "message": "Successfully joined event",
  "type": "participant",
  "event": {
    "_id": "671a0f1234567890abcdef20",
    "title": "Charity Ride for Children",
    "capacity": {
      "maxParticipants": 100,
      "currentParticipants": 1
    },
    "participants": 1,
    "waitlist": 0
  }
}
```

---

## 🔧 Service Management APIs

### 30. Create Service Reminder
**POST** `/service/reminder`

**Request Body:**
```json
{
  "bikeNumberPlate": "DL01AB1234",
  "serviceType": "oil_change",
  "title": "Oil Change Reminder",
  "description": "Time for your bike's oil change service",
  "scheduledFor": "2024-03-01T10:00:00.000Z",
  "priority": "medium",
  "recurrencePattern": {
    "type": "yearly",
    "interval": 1
  }
}
```

```json
{
  "message": "Service reminder created successfully",
  "service": {
    "_id": "671a0f1234567890abcdef21",
    "title": "Oil Change Reminder",
    "description": "Time for your bike's oil change service",
    "serviceType": "oil_change",
    "bike": {
      "brand": "Royal Enfield",
      "model": "Classic 350",
      "numberPlate": "DL01AB1234",
      "color": "Red",
      "odometerReading": 0
    },
    "serviceDate": "2024-03-01T10:00:00.000Z",
    "nextServiceDate": "2025-03-01T10:00:00.000Z",
    "priority": "medium",
    "isRecurring": true,
    "recurrencePattern": {
      "type": "yearly",
      "interval": 1
    },
    "reminders": [
      {
        "type": "next_service",
        "scheduledFor": "2024-03-01T10:00:00.000Z",
        "message": "Service reminder for Royal Enfield Classic 350",
        "priority": "medium",
        "isActive": true,
        "sent": false
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 31. Log Service
**POST** `/service/log`

**Request Body:**
```json
{
  "bike": {
    "brand": "Royal Enfield",
    "model": "Classic 350",
    "numberPlate": "DL01AB1234",
    "color": "Red",
    "odometerReading": 15000
  },
  "serviceType": "oil_change",
  "title": "Oil Change Service",
  "description": "Regular oil change service completed",
  "serviceProvider": {
    "name": "RE Service Center",
    "type": "authorized_dealer",
    "contact": {
      "phone": "9876543210",
      "address": "123 Service Road, Delhi"
    }
  },
  "serviceDate": "2024-01-15T10:00:00.000Z",
  "serviceItems": [
    {
      "item": "Engine Oil",
      "category": "consumable",
      "quantity": 1,
      "unit": "liter",
      "price": 800,
      "brand": "Motul"
    },
    {
      "item": "Oil Filter",
      "category": "part",
      "quantity": 1,
      "unit": "piece",
      "price": 300,
      "brand": "Royal Enfield"
    }
  ],
  "costs": {
    "partsCost": 1100,
    "laborCost": 400,
    "totalCost": 1500,
    "currency": "INR",
    "paymentMethod": "card"
  },
  "notes": {
    "preService": "Bike was running smoothly",
    "postService": "Oil changed successfully, bike feels smoother",
    "recommendations": ["Next service due in 6 months or 5000 km"]
  },
  "tags": ["routine", "oil_change", "maintenance"]
}
```

```json
{
  "message": "Service logged successfully",
  "service": {
    "_id": "671a0f1234567890abcdef22",
    "title": "Oil Change Service",
    "description": "Regular oil change service completed",
    "serviceType": "oil_change",
    "serviceCategory": "preventive",
    "bike": {
      "brand": "Royal Enfield",
      "model": "Classic 350",
      "numberPlate": "DL01AB1234",
      "color": "Red",
      "odometerReading": 15000
    },
    "serviceProvider": {
      "name": "RE Service Center",
      "type": "authorized_dealer",
      "contact": {
        "phone": "9876543210",
        "address": "123 Service Road, Delhi"
      }
    },
    "serviceDate": "2024-01-15T10:00:00.000Z",
    "nextServiceDate": "2024-07-15T10:00:00.000Z",
    "nextServiceOdometer": 20000,
    "serviceItems": [
      {
        "item": "Engine Oil",
        "category": "consumable",
        "quantity": 1,
        "unit": "liter",
        "price": 800,
        "brand": "Motul"
      }
    ],
    "costs": {
      "partsCost": 1100,
      "laborCost": 400,
      "totalCost": 1500,
      "currency": "INR",
      "paymentMethod": "card"
    },
    "status": "completed",
    "notes": {
      "preService": "Bike was running smoothly",
      "postService": "Oil changed successfully, bike feels smoother",
      "recommendations": ["Next service due in 6 months or 5000 km"]
    },
    "tags": ["routine", "oil_change", "maintenance"],
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 💳 Payment APIs

### 32. Create Payment
**POST** `/payments/create`

**Request Body:**
```json
{
  "amount": 599,
  "currency": "INR",
  "purpose": "subscription",
  "description": "Premium Plan Subscription - Monthly",
  "method": "card",
  "relatedEntity": {
    "type": "subscription",
    "id": "671a0f1234567890abcdef23"
  }
}
```

```json
{
  "message": "Payment order created successfully",
  "payment": {
    "_id": "671a0f1234567890abcdef24",
    "paymentId": "PAY_1705312800000_abc123def",
    "orderId": "ORDER_1705312800000_def456ghi",
    "amount": 599,
    "currency": "INR",
    "method": "card",
    "purpose": "subscription",
    "description": "Premium Plan Subscription - Monthly",
    "status": "pending",
    "razorpayOrder": {
      "id": "order_1705312800000",
      "amount": 59900,
      "currency": "INR",
      "receipt": "ORDER_1705312800000_def456ghi",
      "status": "created",
      "created_at": 1705312800000
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 33. Verify Payment
**POST** `/payments/verify`

**Request Body:**
```json
{
  "paymentId": "PAY_1705312800000_abc123def",
  "razorpayPaymentId": "pay_1705312800000_xyz789",
  "razorpaySignature": "signature_hash_here"
}
```

```json
{
  "message": "Payment verified successfully",
  "payment": {
    "_id": "671a0f1234567890abcdef24",
    "paymentId": "PAY_1705312800000_abc123def",
    "status": "captured",
    "amount": 599,
    "purpose": "subscription",
    "completedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

---

## 🎯 Subscription APIs

### 34. Upgrade Subscription
**POST** `/subscription/upgrade`

**Request Body:**
```json
{
  "plan": "premium",
  "billingCycle": "monthly",
  "paymentId": "671a0f1234567890abcdef24",
  "promoCode": "WELCOME10"
}
```

```json
{
  "message": "Subscription upgraded successfully",
  "subscription": {
    "_id": "671a0f1234567890abcdef23",
    "plan": "premium",
    "planName": "Premium Plan",
    "planDescription": "Advanced features for enthusiasts",
    "pricing": {
      "amount": 599,
      "currency": "INR",
      "billingCycle": "monthly",
      "discount": 10,
      "discountedAmount": 539
    },
    "features": {
      "maxTrips": 100,
      "maxEvents": 50,
      "maxPosts": 200,
      "maxFriends": 500,
      "maxStorage": 2000,
      "advancedAnalytics": true,
      "prioritySupport": true,
      "customBranding": false,
      "apiAccess": false,
      "whiteLabel": false
    },
    "status": "active",
    "startDate": "2024-01-15T10:30:00.000Z",
    "endDate": "2024-02-15T10:30:00.000Z",
    "nextBillingDate": "2024-02-15T10:30:00.000Z",
    "usage": {
      "tripsCreated": 0,
      "eventsCreated": 0,
      "postsCreated": 0,
      "friendsAdded": 0,
      "storageUsed": 0
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 35. Get Available Plans
**GET** `/subscription/plans`

```json
{
  "plans": [
    {
      "plan": "free",
      "planName": "Free Plan",
      "planDescription": "Basic features for getting started",
      "pricing": {
        "amount": 0,
        "currency": "INR",
        "billingCycle": "monthly",
        "discount": 0,
        "discountedAmount": 0
      },
      "features": {
        "maxTrips": 5,
        "maxEvents": 2,
        "maxPosts": 10,
        "maxFriends": 50,
        "maxStorage": 100,
        "advancedAnalytics": false,
        "prioritySupport": false,
        "customBranding": false,
        "apiAccess": false,
        "whiteLabel": false
      }
    },
    {
      "plan": "premium",
      "planName": "Premium Plan",
      "planDescription": "Advanced features for enthusiasts",
      "pricing": {
        "amount": 599,
        "currency": "INR",
        "billingCycle": "monthly",
        "discount": 0,
        "discountedAmount": 599
      },
      "features": {
        "maxTrips": 100,
        "maxEvents": 50,
        "maxPosts": 200,
        "maxFriends": 500,
        "maxStorage": 2000,
        "advancedAnalytics": true,
        "prioritySupport": true,
        "customBranding": false,
        "apiAccess": false,
        "whiteLabel": false
      }
    }
  ],
  "currentUser": "671a0f1234567890abcdef12"
}
```

---

## 🔌 Socket.io Events

### Connection
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('connected', (data) => {
  console.log('Connected:', data);
});
```

### Chat Events
```javascript
// Join trip chat
socket.emit('join_trip_chat', { tripId: '671a0f1234567890abcdef13' });

// Send message
socket.emit('send_message', {
  tripId: '671a0f1234567890abcdef13',
  content: 'Hello everyone!',
  type: 'text'
});

// Listen for messages
socket.on('new_message', (message) => {
  console.log('New message:', message);
});
```

### Location Sharing
```javascript
// Start sharing location
socket.emit('start_location_sharing', {
  tripId: '671a0f1234567890abcdef13',
  lat: 28.6139,
  lng: 77.2090,
  accuracy: 10
});

// Update location
socket.emit('update_location', {
  tripId: '671a0f1234567890abcdef13',
  lat: 28.6140,
  lng: 77.2091,
  accuracy: 10,
  speed: 25,
  heading: 90
});

// Listen for location updates
socket.on('user_location_update', (data) => {
  console.log('Location update:', data);
});
```

### Trip Updates
```javascript
// Start trip
socket.emit('trip_started', {
  tripId: '671a0f1234567890abcdef13',
  sessionId: 'TRK_1705312800000_abc123def'
});

// Complete trip
socket.emit('trip_completed', {
  tripId: '671a0f1234567890abcdef13',
  stats: {
    totalDistance: 250.5,
    totalDuration: 120,
    maxSpeed: 85.2,
    averageSpeed: 45.8
  }
});

// Listen for trip updates
socket.on('trip_status_update', (data) => {
  console.log('Trip update:', data);
});
```

### Notifications
```javascript
// Send notification
socket.emit('send_notification', {
  recipientId: '671a0f1234567890abcdef16',
  title: 'Trip Started',
  message: 'Your trip has begun!',
  type: 'trip_started',
  data: {
    relatedEntity: {
      type: 'trip',
      id: '671a0f1234567890abcdef13'
    }
  }
});

// Listen for notifications
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});
```

---

## 📝 Common Response Formats

### Success Response
```json
{
  "message": "Operation completed successfully",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "message": "Error description",
  "error": "Detailed error message",
  "code": "ERROR_CODE"
}
```

### Pagination Response
```json
{
  "data": [ /* array of items */ ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 100,
    "hasMore": true
  }
}
```

---

## 🔧 Environment Variables

Create a `.env` file with the following variables:

```env
# Database
MONGO_URI=mongodb://localhost:27017/rider-app

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Cloudinary (for media uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Razorpay (for payments)
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# Twilio (for SMS)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000

# Server
PORT=5000
NODE_ENV=development
```

---

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Start the server:**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

4. **Test the API:**
   - Import the endpoints into Postman
   - Use the dummy data provided above
   - Start with authentication endpoints first

---

## 📱 Postman Collection Setup

1. **Create a new collection** in Postman
2. **Set collection variables:**
   - `baseUrl`: `http://localhost:5000/api/v1`
   - `token`: (will be set after login)
3. **Add Authorization header** to collection:
   - Type: Bearer Token
   - Token: `{{token}}`
4. **Import all endpoints** using the examples above
5. **Test authentication flow** first, then other endpoints

This documentation covers all the major APIs in your rider app backend. Use the dummy data provided to test each endpoint in Postman! 🚀