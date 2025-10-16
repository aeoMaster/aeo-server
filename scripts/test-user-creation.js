#!/usr/bin/env node

/**
 * Test User Creation for Cognito Users
 *
 * This script tests the user creation logic to ensure
 * Cognito users can be created without password validation errors.
 */

require("dotenv").config();
const mongoose = require("mongoose");

// Import the User model
require("../dist/models/User");

const MONGODB_URI = process.env.MONGODB_URI;

console.log("🧪 Testing Cognito User Creation\n");

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is not set");
  process.exit(1);
}

async function testCognitoUserCreation() {
  try {
    // Connect to MongoDB
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB successfully");

    const User = mongoose.model("User");

    // Test user data (similar to what comes from Cognito)
    const testUserData = {
      cognitoSub: "test-cognito-sub-" + Date.now(),
      email: "test-cognito-user@example.com",
      name: "Test Cognito User",
      cognitoGroups: ["test-group"],
      role: "user",
      roles: ["user"],
      status: "active",
      lastLogin: new Date(),
    };

    console.log("\n🧪 Testing user creation with Cognito data...");
    console.log("📋 User data:", testUserData);

    // Clean up any existing test user
    await User.deleteOne({ email: testUserData.email });

    // Create user
    const user = await User.create(testUserData);
    console.log("✅ User created successfully!");
    console.log("📋 Created user:", {
      id: user._id,
      email: user.email,
      cognitoSub: user.cognitoSub,
      name: user.name,
      role: user.role,
      status: user.status,
    });

    // Verify the user was created without password
    const retrievedUser = await User.findById(user._id);
    console.log("\n🔍 Verifying user data...");
    console.log(
      "✅ Password field:",
      retrievedUser.password
        ? "Present"
        : "Not present (correct for Cognito users)"
    );
    console.log("✅ Cognito Sub:", retrievedUser.cognitoSub);
    console.log("✅ Email:", retrievedUser.email);

    // Clean up test user
    await User.findByIdAndDelete(user._id);
    console.log("🧹 Test user cleaned up");

    console.log("\n✅ Cognito user creation test completed successfully");
  } catch (error) {
    console.error("\n❌ Cognito user creation test failed:", error);
    if (error.name === "ValidationError") {
      console.error("📋 Validation errors:", error.errors);
    }
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed");
  }
}

testCognitoUserCreation();
