const axios = require("axios");

const BASE_URL = "http://localhost:8080/api";

// Test team members tracking
async function testMembersTracking() {
  try {
    console.log("🧪 Testing Team Members Tracking...\n");

    // 1. Test tracking members usage
    console.log("1. Testing members usage tracking...");
    const trackResponse = await axios.post(
      `${BASE_URL}/usage/track`,
      {
        type: "members",
        amount: 1,
      },
      {
        headers: {
          Authorization: "Bearer YOUR_TOKEN_HERE",
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ Members tracking response:", trackResponse.data);

    // 2. Test getting current usage (should include members)
    console.log("\n2. Testing current usage with members...");
    const usageResponse = await axios.get(`${BASE_URL}/usage/current`, {
      headers: {
        Authorization: "Bearer YOUR_TOKEN_HERE",
      },
    });
    console.log("✅ Current usage response:", usageResponse.data);

    // 3. Test usage history
    console.log("\n3. Testing usage history...");
    const historyResponse = await axios.get(
      `${BASE_URL}/usage/history?type=members`,
      {
        headers: {
          Authorization: "Bearer YOUR_TOKEN_HERE",
        },
      }
    );
    console.log("✅ Usage history response:", historyResponse.data);
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

// Test usage limits checking
async function testUsageLimits() {
  try {
    console.log("\n🧪 Testing Usage Limits...\n");

    // Test if user can add more members
    console.log("1. Testing members limit checking...");
    const limitResponse = await axios.get(`${BASE_URL}/usage/current`, {
      headers: {
        Authorization: "Bearer YOUR_TOKEN_HERE",
      },
    });

    const membersUsage = limitResponse.data.members;
    console.log("✅ Members usage:", membersUsage);

    if (membersUsage.remaining > 0 || membersUsage.remaining === -1) {
      console.log("✅ Can add more members");
    } else {
      console.log("❌ Cannot add more members - limit reached");
    }
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  console.log("🚀 Starting Team Members Tracking Tests\n");

  await testMembersTracking();
  await testUsageLimits();

  console.log("\n✅ Tests completed!");
}

// Run if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testMembersTracking, testUsageLimits };
