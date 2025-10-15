#!/usr/bin/env node

/**
 * Test Simplified Cognito Auth Flow
 *
 * This script tests the simplified authentication flow
 * to ensure it works correctly.
 */

require("dotenv").config();

const COGNITO_REGION = process.env.COGNITO_REGION || "us-east-1";
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_APP_CLIENT_ID = process.env.COGNITO_APP_CLIENT_ID;
const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN;
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;

console.log("🧪 Testing Simplified Cognito Auth Flow\n");

// Test configuration
console.log("📋 Configuration Check:");
const requiredVars = {
  COGNITO_REGION: COGNITO_REGION,
  COGNITO_USER_POOL_ID: COGNITO_USER_POOL_ID,
  COGNITO_APP_CLIENT_ID: COGNITO_APP_CLIENT_ID,
  COGNITO_DOMAIN: COGNITO_DOMAIN,
  OAUTH_REDIRECT_URI: OAUTH_REDIRECT_URI,
};

let hasErrors = false;
Object.entries(requiredVars).forEach(([key, value]) => {
  if (!value) {
    console.error(`❌ Missing: ${key}`);
    hasErrors = true;
  } else {
    console.log(
      `✅ ${key}: ${value.substring(0, 20)}${value.length > 20 ? "..." : ""}`
    );
  }
});

if (hasErrors) {
  console.log("\n❌ Configuration errors found.");
  process.exit(1);
}

// Test URL construction
console.log("\n🔧 URL Construction Test:");

let cleanDomain = COGNITO_DOMAIN;
if (COGNITO_DOMAIN.startsWith("https://")) {
  cleanDomain = COGNITO_DOMAIN.replace("https://", "");
}

const baseUrl = COGNITO_DOMAIN.startsWith("https://")
  ? COGNITO_DOMAIN
  : `https://${cleanDomain}`;

const urls = {
  login: `${baseUrl}/login?client_id=${COGNITO_APP_CLIENT_ID}&response_type=code&scope=openid+email+profile&redirect_uri=${encodeURIComponent(OAUTH_REDIRECT_URI)}`,
  token: `${baseUrl}/oauth2/token`,
  logout: `${baseUrl}/logout?client_id=${COGNITO_APP_CLIENT_ID}&logout_uri=${encodeURIComponent(OAUTH_REDIRECT_URI.replace("/callback", ""))}`,
};

console.log("📋 Generated URLs:");
Object.entries(urls).forEach(([key, url]) => {
  console.log(`   ${key}: ${url}`);

  try {
    new URL(url);
    console.log(`   ✅ Valid URL`);
  } catch (error) {
    console.log(`   ❌ Invalid URL: ${error.message}`);
  }
});

// Test endpoints
async function testEndpoint(name, url) {
  try {
    console.log(`\n🔍 Testing ${name} endpoint...`);

    const response = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Simplified-Auth-Test/1.0" },
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (response.status < 500) {
      console.log(`   ✅ Endpoint is reachable`);
    } else {
      console.log(`   ⚠️  Endpoint returned server error`);
    }
  } catch (error) {
    console.log(`   ❌ Endpoint test failed: ${error.message}`);
  }
}

// Test login endpoint
testEndpoint("Login", `${baseUrl}/login`);

// Test token endpoint with dummy request
async function testTokenEndpoint() {
  try {
    console.log("\n🔍 Testing Token Endpoint...");

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: COGNITO_APP_CLIENT_ID,
      code: "dummy-code",
      redirect_uri: OAUTH_REDIRECT_URI,
    });

    const response = await fetch(urls.token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (response.status === 400) {
      const text = await response.text();
      if (
        text.includes("invalid_grant") ||
        text.includes("Invalid authorization code")
      ) {
        console.log(
          `   ✅ Token endpoint is accessible (expected error for dummy code)`
        );
      } else {
        console.log(`   ⚠️  Unexpected error: ${text.substring(0, 100)}`);
      }
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Token endpoint test failed: ${error.message}`);
  }
}

testTokenEndpoint();

console.log("\n🎯 Simplified Flow Benefits:");
console.log("   ✅ No complex state management");
console.log("   ✅ No PKCE complexity");
console.log("   ✅ Simple session-based auth");
console.log("   ✅ Direct Cognito integration");
console.log("   ✅ Easy to debug and maintain");

console.log("\n🚀 Next Steps:");
console.log("   1. Deploy the simplified auth routes");
console.log("   2. Test the login flow: GET /api/auth/login");
console.log("   3. Verify callback handling: GET /api/auth/callback");
console.log("   4. Check session management: GET /api/auth/me");

console.log("\n🏁 Simplified auth test completed.");
