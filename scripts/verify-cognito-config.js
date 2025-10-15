#!/usr/bin/env node

/**
 * Verify Cognito Configuration
 * This script helps diagnose Cognito configuration issues
 */

const https = require("https");

// Get environment variables
const region = process.env.COGNITO_REGION || process.env.AWS_REGION;
const userPoolId =
  process.env.COGNITO_USER_POOL_ID || process.env.AWS_COGNITO_USER_POOL_ID;
const domain = process.env.COGNITO_DOMAIN || process.env.AWS_COGNITO_DOMAIN;

console.log("🔍 Verifying Cognito Configuration...\n");

console.log("📋 Configuration:");
console.log(`   Region: ${region}`);
console.log(`   User Pool ID: ${userPoolId}`);
console.log(`   Domain: ${domain}\n`);

if (!region || !userPoolId) {
  console.error("❌ Missing required environment variables");
  process.exit(1);
}

// Test JWKS endpoint
const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;

console.log(`🔗 Testing JWKS endpoint: ${jwksUrl}\n`);

https
  .get(jwksUrl, (res) => {
    console.log(`📊 Response Status: ${res.statusCode}`);
    console.log(`📊 Response Headers:`, res.headers);

    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      if (res.statusCode === 200) {
        console.log("✅ JWKS endpoint is working!");
        try {
          const jwks = JSON.parse(data);
          console.log(`📋 Found ${jwks.keys?.length || 0} keys`);
        } catch (e) {
          console.log("⚠️  Response is not valid JSON");
        }
      } else {
        console.log("❌ JWKS endpoint failed");
        console.log(`📄 Response: ${data}`);

        if (res.statusCode === 400) {
          console.log("\n🔧 Troubleshooting 400 Error:");
          console.log("   1. Verify User Pool ID format: us-east-1_XXXXXXXXX");
          console.log("   2. Check if User Pool ID starts with region");
          console.log("   3. Ensure User Pool exists in the correct region");
          console.log("   4. Verify User Pool is not deleted or disabled");
        }
      }
    });
  })
  .on("error", (err) => {
    console.error("❌ Network error:", err.message);
  });
