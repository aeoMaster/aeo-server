#!/usr/bin/env node

/**
 * Test script to verify dual authentication support
 * Tests both Bearer token and session cookie authentication
 */

const https = require("https");
const http = require("http");

const API_BASE = process.env.API_BASE || "https://server-api.themoda.io";
const TEST_TOKEN = process.env.TEST_TOKEN || "your-test-jwt-token-here";

console.log("🧪 Testing Dual Authentication Support");
console.log("=====================================");

// Test 1: Bearer Token Authentication
async function testBearerToken() {
  console.log("\n1️⃣ Testing Bearer Token Authentication...");

  return new Promise((resolve) => {
    const url = new URL("/api/auth/me", API_BASE);
    const options = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
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
          console.log("   ✅ Bearer token authentication successful");
          try {
            const user = JSON.parse(data);
            console.log(`   👤 User: ${user.user?.email || "Unknown"}`);
          } catch (e) {
            console.log("   📄 Response:", data.substring(0, 100) + "...");
          }
        } else {
          console.log("   ❌ Bearer token authentication failed");
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

// Test 2: Session Cookie Authentication
async function testSessionCookie() {
  console.log("\n2️⃣ Testing Session Cookie Authentication...");

  return new Promise((resolve) => {
    const url = new URL("/api/auth/me", API_BASE);
    const options = {
      method: "GET",
      headers: {
        Cookie: `aeo_session=${TEST_TOKEN}`,
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
          console.log("   ✅ Session cookie authentication successful");
          try {
            const user = JSON.parse(data);
            console.log(`   👤 User: ${user.user?.email || "Unknown"}`);
          } catch (e) {
            console.log("   📄 Response:", data.substring(0, 100) + "...");
          }
        } else {
          console.log("   ❌ Session cookie authentication failed");
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

// Test 3: No Authentication (should fail)
async function testNoAuth() {
  console.log("\n3️⃣ Testing No Authentication (should fail)...");

  return new Promise((resolve) => {
    const url = new URL("/api/auth/me", API_BASE);
    const options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const client = url.protocol === "https:" ? https : http;

    const req = client.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log(`   Status: ${res.statusCode}`);
        if (res.statusCode === 401) {
          console.log("   ✅ Correctly rejected unauthenticated request");
        } else {
          console.log("   ❌ Should have rejected unauthenticated request");
        }
        console.log("   📄 Response:", data);
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

// Run all tests
async function runTests() {
  console.log(`🌐 Testing against: ${API_BASE}`);
  console.log(`🔑 Using token: ${TEST_TOKEN.substring(0, 20)}...`);

  await testBearerToken();
  await testSessionCookie();
  await testNoAuth();

  console.log("\n✨ Test completed!");
  console.log("\n📝 Usage:");
  console.log("   node test-dual-auth.js");
  console.log("   API_BASE=https://your-api.com node test-dual-auth.js");
  console.log("   TEST_TOKEN=your-jwt-token node test-dual-auth.js");
}

runTests().catch(console.error);
