#!/usr/bin/env node

/**
 * Debug script to test cookie authentication
 * Helps identify JWT token format issues
 */

const https = require("https");
const http = require("http");

const API_BASE = process.env.API_BASE || "https://server-api.themoda.io";

console.log("🔍 Cookie Authentication Debug Tool");
console.log("====================================");

// Test with different cookie formats
async function testCookieFormat(cookieValue, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(
    `   Cookie value: ${cookieValue.substring(0, 50)}${cookieValue.length > 50 ? "..." : ""}`
  );

  return new Promise((resolve) => {
    const url = new URL("/api/auth/me", API_BASE);
    const options = {
      method: "GET",
      headers: {
        Cookie: `aeo_session=${cookieValue}`,
        "Content-Type": "application/json",
      },
    };

    const client = url.protocol === "https:" ? https : http;

    const req = client.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log(`   Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          console.log("   ✅ Success");
          try {
            const user = JSON.parse(data);
            console.log(`   👤 User: ${user.user?.email || "Unknown"}`);
          } catch (e) {
            console.log("   📄 Response:", data.substring(0, 100) + "...");
          }
        } else {
          console.log("   ❌ Failed");
          console.log("   📄 Response:", data);
        }
        resolve();
      });
    });

    req.on("error", (err) => {
      console.log("   ❌ Request failed:", err.message);
      resolve();
    });

    req.end();
  });
}

// Test different scenarios
async function runDebugTests() {
  console.log(`🌐 Testing against: ${API_BASE}`);

  // Test 1: Literal "token" string (what client might be sending)
  await testCookieFormat("token", "Literal 'token' string");

  // Test 2: Empty cookie
  await testCookieFormat("", "Empty cookie");

  // Test 3: Malformed JWT (missing parts)
  await testCookieFormat(
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
    "Malformed JWT (missing parts)"
  );

  // Test 4: Invalid JWT format
  await testCookieFormat("not-a-jwt-token", "Invalid JWT format");

  // Test 5: Valid JWT format but wrong signature (if you have a test token)
  const testToken = process.env.TEST_TOKEN;
  if (testToken && testToken !== "your-test-jwt-token-here") {
    await testCookieFormat(testToken, "Real JWT token");
  } else {
    console.log("\n💡 To test with a real JWT token:");
    console.log(
      "   TEST_TOKEN=your-actual-jwt-token node debug-cookie-auth.js"
    );
  }

  console.log("\n✨ Debug completed!");
  console.log("\n📝 Expected behavior:");
  console.log("   - Literal 'token' should fail with 'Invalid token format'");
  console.log("   - Empty cookie should fail with 'Not authenticated'");
  console.log("   - Malformed JWT should fail with 'Invalid token format'");
  console.log("   - Real JWT should succeed (if valid)");
}

runDebugTests().catch(console.error);
