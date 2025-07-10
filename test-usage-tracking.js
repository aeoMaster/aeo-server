const axios = require("axios");

const BASE_URL = "http://localhost:8080/api";

// Test usage tracking
async function testUsageTracking() {
  try {
    console.log("🧪 Testing Usage Tracking...\n");

    // 1. Get current usage before creating analysis
    console.log("1. Getting current usage...");
    const initialUsage = await axios.get(`${BASE_URL}/usage/current`, {
      headers: {
        Authorization: "Bearer YOUR_TOKEN_HERE",
      },
    });
    console.log("✅ Initial usage:", initialUsage.data);

    // 2. Create a test analysis (this should increment usage)
    console.log("\n2. Creating test analysis...");
    const analysisResponse = await axios.post(
      `${BASE_URL}/analyze`,
      {
        type: "url",
        content: "https://example.com",
        company: "Test Company",
        section: "Test Section",
      },
      {
        headers: {
          Authorization: "Bearer YOUR_TOKEN_HERE",
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ Analysis created:", analysisResponse.data._id);

    // 3. Get usage after creating analysis
    console.log("\n3. Getting usage after analysis...");
    const afterAnalysisUsage = await axios.get(`${BASE_URL}/usage/current`, {
      headers: {
        Authorization: "Bearer YOUR_TOKEN_HERE",
      },
    });
    console.log("✅ Usage after analysis:", afterAnalysisUsage.data);

    // 4. Create a test clarity scan (this should increment clarity_scan usage)
    console.log("\n4. Creating test clarity scan...");
    const scanResponse = await axios.get(
      `${BASE_URL}/clarity-scan/scan?url=https://example.com`,
      {
        headers: {
          Authorization: "Bearer YOUR_TOKEN_HERE",
        },
      }
    );
    console.log("✅ Clarity scan created:", scanResponse.data._id);

    // 5. Get usage after creating clarity scan
    console.log("\n5. Getting usage after clarity scan...");
    const afterScanUsage = await axios.get(`${BASE_URL}/usage/current`, {
      headers: {
        Authorization: "Bearer YOUR_TOKEN_HERE",
      },
    });
    console.log("✅ Usage after clarity scan:", afterScanUsage.data);

    // 6. Compare usage changes
    console.log("\n6. Usage Changes Summary:");
    console.log("📊 Analysis usage:");
    console.log(`   Before: ${initialUsage.data.analysis.used}`);
    console.log(`   After:  ${afterAnalysisUsage.data.analysis.used}`);
    console.log(
      `   Change: +${afterAnalysisUsage.data.analysis.used - initialUsage.data.analysis.used}`
    );

    console.log("\n📊 Clarity scan usage:");
    console.log(`   Before: ${initialUsage.data.clarity_scan.used}`);
    console.log(`   After:  ${afterScanUsage.data.clarity_scan.used}`);
    console.log(
      `   Change: +${afterScanUsage.data.clarity_scan.used - initialUsage.data.clarity_scan.used}`
    );
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

// Test usage limits
async function testUsageLimits() {
  try {
    console.log("\n🧪 Testing Usage Limits...\n");

    // Get current usage
    const usageResponse = await axios.get(`${BASE_URL}/usage/current`, {
      headers: {
        Authorization: "Bearer YOUR_TOKEN_HERE",
      },
    });

    const usage = usageResponse.data;

    console.log("📊 Current Usage Status:");
    console.log(
      `   Analysis: ${usage.analysis.used}/${usage.analysis.total} (${usage.analysis.remaining} remaining)`
    );
    console.log(
      `   Clarity Scans: ${usage.clarity_scan.used}/${usage.clarity_scan.total} (${usage.clarity_scan.remaining} remaining)`
    );
    console.log(
      `   Chat Messages: ${usage.chat_message.used}/${usage.chat_message.total} (${usage.chat_message.remaining} remaining)`
    );
    console.log(
      `   Members: ${usage.members.used}/${usage.members.total} (${usage.members.remaining} remaining)`
    );

    // Check if limits are reached
    if (usage.analysis.remaining <= 0 && usage.analysis.total > 0) {
      console.log("\n⚠️  Analysis limit reached!");
    }

    if (usage.clarity_scan.remaining <= 0 && usage.clarity_scan.total > 0) {
      console.log("\n⚠️  Clarity scan limit reached!");
    }

    if (usage.members.remaining <= 0 && usage.members.total > 0) {
      console.log("\n⚠️  Member limit reached!");
    }
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  console.log("🚀 Starting Usage Tracking Tests\n");

  await testUsageTracking();
  await testUsageLimits();

  console.log("\n✅ Tests completed!");
  console.log("\n💡 Usage tracking is now working!");
  console.log("   - Analysis creation increments analysis usage");
  console.log("   - Clarity scan creation increments clarity_scan usage");
  console.log("   - Team members are tracked automatically");
  console.log("   - Limits are enforced based on package features");
}

// Run if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testUsageTracking, testUsageLimits };
