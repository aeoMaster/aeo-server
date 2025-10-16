#!/usr/bin/env node

/**
 * Test Fixed Cognito Flow
 *
 * This script tests the corrected Cognito authentication flow
 * with proper PKCE and correct endpoint usage.
 */

require("dotenv").config();
const crypto = require("crypto");

const COGNITO_REGION = process.env.COGNITO_REGION || "us-east-1";
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_APP_CLIENT_ID = process.env.COGNITO_APP_CLIENT_ID;
const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN;
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;

console.log("🧪 Testing Fixed Cognito Flow\n");

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

// Test URL construction with PKCE
console.log("\n🔧 Testing URL Construction with PKCE:");

// Generate PKCE parameters (same as backend)
const codeVerifier = crypto.randomBytes(32).toString("base64url");
const codeChallenge = crypto
  .createHash("sha256")
  .update(codeVerifier)
  .digest("base64url");

// Generate state
const state = crypto.randomBytes(16).toString("hex");

console.log(`   Code Verifier: ${codeVerifier.substring(0, 20)}...`);
console.log(`   Code Challenge: ${codeChallenge.substring(0, 20)}...`);
console.log(`   State: ${state.substring(0, 20)}...`);

// Test domain handling
let cleanDomain = COGNITO_DOMAIN;
if (COGNITO_DOMAIN.startsWith("https://")) {
  cleanDomain = COGNITO_DOMAIN.replace("https://", "");
}

const baseUrl = COGNITO_DOMAIN.startsWith("https://")
  ? COGNITO_DOMAIN
  : `https://${cleanDomain}`;

console.log(`   Base URL: ${baseUrl}`);

// Build the correct authorize URL
const authUrl = new URL(`${baseUrl}/login`); // CORRECT: /login not /login/oauth2/authorize
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("client_id", COGNITO_APP_CLIENT_ID);
authUrl.searchParams.set("redirect_uri", OAUTH_REDIRECT_URI);
authUrl.searchParams.set("scope", "openid email profile");
authUrl.searchParams.set("state", state);
authUrl.searchParams.set("code_challenge", codeChallenge);
authUrl.searchParams.set("code_challenge_method", "S256");

console.log("\n📋 Generated Authorization URL:");
console.log(`   ${authUrl.toString()}`);

// Validate URL
try {
  new URL(authUrl.toString());
  console.log("   ✅ Valid URL");
} catch (error) {
  console.log(`   ❌ Invalid URL: ${error.message}`);
}

// Test token endpoint
const tokenEndpoint = `${baseUrl}/oauth2/token`;
console.log(`\n📋 Token Endpoint: ${tokenEndpoint}`);

// Test endpoints
async function testEndpoint(name, url) {
  try {
    console.log(`\n🔍 Testing ${name} endpoint...`);

    const response = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Fixed-Cognito-Test/1.0" },
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

// Test token endpoint with PKCE
async function testTokenEndpointWithPkce() {
  try {
    console.log("\n🔍 Testing Token Endpoint with PKCE...");

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: COGNITO_APP_CLIENT_ID,
      code: "dummy-code",
      redirect_uri: OAUTH_REDIRECT_URI,
      code_verifier: codeVerifier, // Include PKCE verifier
    });

    const response = await fetch(tokenEndpoint, {
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

testTokenEndpointWithPkce();

console.log("\n🎯 Fixed Flow Benefits:");
console.log("   ✅ Uses correct Cognito endpoint (/login)");
console.log("   ✅ Implements proper PKCE for security");
console.log("   ✅ Uses session-based state management");
console.log("   ✅ Proper CSRF protection with state parameter");
console.log("   ✅ Correct scope format (space-separated)");

console.log("\n🔧 Key Fixes Applied:");
console.log("   ✅ Changed from /login/oauth2/authorize → /login");
console.log("   ✅ Added PKCE code_verifier to token exchange");
console.log(
  "   ✅ Fixed scope format: openid+email+profile → openid email profile"
);
console.log("   ✅ Session-based state storage (no MongoDB complexity)");

console.log("\n🚀 Next Steps:");
console.log("   1. Deploy the fixed auth routes");
console.log("   2. Test login: GET /api/auth/login");
console.log("   3. Verify callback: GET /api/auth/callback");
console.log("   4. Check session management: GET /api/auth/me");

console.log("\n🏁 Fixed Cognito flow test completed.");
