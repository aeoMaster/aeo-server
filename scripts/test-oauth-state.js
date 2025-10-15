#!/usr/bin/env node

/**
 * Test OAuth State Storage Script
 *
 * This script tests the MongoDB OAuth state storage to help debug
 * state parameter issues.
 */

require("dotenv").config();
const mongoose = require("mongoose");

// Import the OAuth state model
require("../src/models/OAuthState");

const MONGODB_URI = process.env.MONGODB_URI;

console.log("🔍 Testing OAuth State Storage...\n");

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is not set");
  process.exit(1);
}

console.log(`📋 MongoDB URI: ${MONGODB_URI.substring(0, 50)}...`);

async function testOAuthStateStorage() {
  try {
    // Connect to MongoDB
    console.log("\n🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB successfully");

    const OAuthState = mongoose.model("OAuthState");

    // Test state storage
    console.log("\n🧪 Testing OAuth state storage...");

    const testState = "test-state-" + Date.now();
    const testKey = `state:${testState}`;
    const testData = {
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes from now
    };

    console.log(`   Creating test state: ${testKey}`);

    // Store state
    await OAuthState.findOneAndUpdate(
      { key: testKey },
      {
        key: testKey,
        data: testData,
        expiresAt: new Date(testData.expiresAt),
        createdAt: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log("   ✅ State stored successfully");

    // Retrieve state
    console.log(`   Retrieving state: ${testKey}`);
    const retrievedDoc = await OAuthState.findOne({ key: testKey });

    if (retrievedDoc) {
      console.log("   ✅ State retrieved successfully");
      console.log(`   Data: ${JSON.stringify(retrievedDoc.data)}`);
      console.log(`   Expires: ${retrievedDoc.expiresAt.toISOString()}`);
    } else {
      console.log("   ❌ State not found");
    }

    // Test state retrieval with different key format
    console.log(`\n🧪 Testing state retrieval with different key format...`);
    const alternativeKey = `state:${testState}`;
    const altDoc = await OAuthState.findOne({ key: alternativeKey });

    if (altDoc) {
      console.log("   ✅ Alternative key format works");
    } else {
      console.log("   ❌ Alternative key format failed");
    }

    // List all states in database
    console.log("\n📋 Listing all OAuth states in database...");
    const allStates = await OAuthState.find({
      key: { $regex: "^state:" },
    }).limit(10);
    console.log(`   Found ${allStates.length} states:`);

    allStates.forEach((state, index) => {
      console.log(`   ${index + 1}. Key: ${state.key}`);
      console.log(`      Expires: ${state.expiresAt.toISOString()}`);
      console.log(`      Created: ${state.createdAt.toISOString()}`);
    });

    // Clean up test state
    console.log("\n🧹 Cleaning up test state...");
    await OAuthState.deleteOne({ key: testKey });
    console.log("   ✅ Test state cleaned up");

    // Test expired state cleanup
    console.log("\n🧪 Testing expired state behavior...");
    const expiredState = "expired-state-" + Date.now();
    const expiredKey = `state:${expiredState}`;
    const expiredData = {
      expiresAt: Date.now() - 1000, // 1 second ago (expired)
    };

    await OAuthState.findOneAndUpdate(
      { key: expiredKey },
      {
        key: expiredKey,
        data: expiredData,
        expiresAt: new Date(expiredData.expiresAt),
        createdAt: new Date(),
      },
      { upsert: true, new: true }
    );

    const expiredDoc = await OAuthState.findOne({ key: expiredKey });
    if (expiredDoc) {
      console.log("   ✅ Expired state found in database");
      console.log(`   Expires: ${expiredDoc.expiresAt.toISOString()}`);
      console.log(
        `   Is expired: ${expiredDoc.expiresAt.getTime() < Date.now()}`
      );
    }

    // Clean up expired state
    await OAuthState.deleteOne({ key: expiredKey });

    console.log("\n✅ OAuth state storage test completed successfully");
  } catch (error) {
    console.error("\n❌ OAuth state storage test failed:", error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed");
  }
}

testOAuthStateStorage();
