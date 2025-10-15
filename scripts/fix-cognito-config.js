#!/usr/bin/env node

/**
 * Fix Cognito Configuration Script
 *
 * This script helps identify and fix Cognito configuration issues.
 */

require("dotenv").config();

const COGNITO_REGION = process.env.COGNITO_REGION || "us-east-1";
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN;
const COGNITO_APP_CLIENT_ID = process.env.COGNITO_APP_CLIENT_ID;

console.log("🔧 Cognito Configuration Analysis\n");

console.log("📋 Current Environment Variables:");
console.log(`   COGNITO_REGION: ${COGNITO_REGION}`);
console.log(`   COGNITO_USER_POOL_ID: ${COGNITO_USER_POOL_ID}`);
console.log(`   COGNITO_DOMAIN: ${COGNITO_DOMAIN}`);
console.log(
  `   COGNITO_APP_CLIENT_ID: ${COGNITO_APP_CLIENT_ID?.substring(0, 20)}...`
);

console.log("\n🔍 Analysis:");

// Check if domain looks like a User Pool ID
if (COGNITO_DOMAIN && COGNITO_DOMAIN.includes("_")) {
  console.log(
    "   ❌ COGNITO_DOMAIN appears to be set to User Pool ID instead of domain"
  );
  console.log(
    "   💡 The domain should look like: xxxx.auth.us-east-1.amazoncognito.com"
  );
  console.log("   💡 The domain should NOT contain underscores");
}

// Check if domain has the correct format
if (COGNITO_DOMAIN && !COGNITO_DOMAIN.includes(".auth.")) {
  console.log(
    "   ❌ COGNITO_DOMAIN doesn't contain '.auth.' which is expected for Cognito domains"
  );
}

// Check if User Pool ID format is correct
if (COGNITO_USER_POOL_ID && !COGNITO_USER_POOL_ID.startsWith(COGNITO_REGION)) {
  console.log("   ⚠️  COGNITO_USER_POOL_ID doesn't start with region");
}

console.log("\n🔧 Recommended Fixes:");

// Generate the correct domain format based on User Pool ID
if (COGNITO_USER_POOL_ID && COGNITO_USER_POOL_ID.startsWith(COGNITO_REGION)) {
  // Extract the domain prefix from User Pool ID
  // User Pool ID format: us-east-1_yGTgnpK2O
  // Domain format: us-east-1ygtgnpk2o.auth.us-east-1.amazoncognito.com

  const userPoolSuffix = COGNITO_USER_POOL_ID.substring(
    COGNITO_REGION.length + 1
  ); // Remove region_
  const domainPrefix = userPoolSuffix.toLowerCase(); // Convert to lowercase

  const correctDomain = `${COGNITO_REGION}${domainPrefix}.auth.${COGNITO_REGION}.amazoncognito.com`;

  console.log(`   📝 Set COGNITO_DOMAIN to: ${correctDomain}`);
  console.log(`   📝 Or with https://: https://${correctDomain}`);
}

console.log("\n📋 Environment Variable Checklist:");
console.log("   ✅ COGNITO_REGION: Should be AWS region (e.g., us-east-1)");
console.log(
  "   ✅ COGNITO_USER_POOL_ID: Should start with region (e.g., us-east-1_yGTgnpK2O)"
);
console.log(
  "   ✅ COGNITO_DOMAIN: Should be domain without protocol (e.g., xxxx.auth.us-east-1.amazoncognito.com)"
);
console.log(
  "   ✅ COGNITO_APP_CLIENT_ID: Should be your Cognito App Client ID"
);
console.log(
  "   ✅ OAUTH_REDIRECT_URI: Should be your callback URL (e.g., https://yourdomain.com/api/auth/callback)"
);

console.log("\n🔧 How to Fix:");
console.log(
  "   1. Update your environment variables (Docker, .env file, etc.)"
);
console.log(
  "   2. Make sure COGNITO_DOMAIN is set to the actual Cognito domain, not the User Pool ID"
);
console.log("   3. Restart your application");
console.log("   4. Test the authentication flow");

console.log("\n🏁 Configuration analysis completed.");
