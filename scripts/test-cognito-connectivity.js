#!/usr/bin/env node

/**
 * Test Cognito Connectivity Script
 *
 * This script tests the Cognito endpoints and configuration to help debug
 * authentication issues.
 */

require("dotenv").config();

const COGNITO_REGION = process.env.COGNITO_REGION || "us-east-1";
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_APP_CLIENT_ID = process.env.COGNITO_APP_CLIENT_ID;
const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN;
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;

console.log("🔍 Testing Cognito Configuration...\n");

// Check required environment variables
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
    console.error(`❌ Missing required environment variable: ${key}`);
    hasErrors = true;
  } else {
    console.log(
      `✅ ${key}: ${value.substring(0, 20)}${value.length > 20 ? "..." : ""}`
    );
  }
});

if (hasErrors) {
  console.log(
    "\n❌ Configuration errors found. Please fix the missing environment variables."
  );
  process.exit(1);
}

// Construct endpoints
let cleanDomain = COGNITO_DOMAIN;
if (COGNITO_DOMAIN.startsWith("https://")) {
  cleanDomain = COGNITO_DOMAIN.replace("https://", "");
}

const baseUrl = `https://${cleanDomain}`;
const endpoints = {
  authorization: `${baseUrl}/login`,
  token: `${baseUrl}/oauth2/token`,
  logout: `${baseUrl}/logout`,
  jwks: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
};

console.log("\n📋 Constructed Endpoints:");
Object.entries(endpoints).forEach(([key, url]) => {
  console.log(`   ${key}: ${url}`);
});

// Test endpoints
async function testEndpoint(name, url) {
  try {
    console.log(`\n🔍 Testing ${name}...`);
    console.log(`   URL: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Cognito-Test-Script/1.0",
      },
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      console.log(`   ✅ ${name} endpoint is accessible`);
    } else {
      console.log(`   ❌ ${name} endpoint returned error: ${response.status}`);
      const text = await response.text();
      if (text) {
        console.log(
          `   Response: ${text.substring(0, 200)}${text.length > 200 ? "..." : ""}`
        );
      }
    }
  } catch (error) {
    console.log(`   ❌ ${name} endpoint failed: ${error.message}`);
  }
}

// Test JWKS endpoint
testEndpoint("JWKS", endpoints.jwks);

// Test authorization endpoint
testEndpoint("Authorization", endpoints.authorization);

// Test token endpoint with a dummy request
async function testTokenEndpoint() {
  try {
    console.log("\n🔍 Testing Token Endpoint...");
    console.log(`   URL: ${endpoints.token}`);

    // Create a dummy request to test if the endpoint is reachable
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: COGNITO_APP_CLIENT_ID,
      code: "dummy-code",
      redirect_uri: OAUTH_REDIRECT_URI,
    });

    const response = await fetch(endpoints.token, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
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
          `   ✅ Token endpoint is accessible (returned expected error for dummy code)`
        );
      } else {
        console.log(
          `   ⚠️  Token endpoint returned 400 but with unexpected error: ${text.substring(0, 200)}`
        );
      }
    } else {
      console.log(
        `   ❌ Token endpoint returned unexpected status: ${response.status}`
      );
      const text = await response.text();
      if (text) {
        console.log(
          `   Response: ${text.substring(0, 200)}${text.length > 200 ? "..." : ""}`
        );
      }
    }
  } catch (error) {
    console.log(`   ❌ Token endpoint failed: ${error.message}`);
  }
}

testTokenEndpoint();

// Validate configuration
console.log("\n🔍 Validating Configuration...");

// Check User Pool ID format
if (!COGNITO_USER_POOL_ID.startsWith(COGNITO_REGION)) {
  console.log(
    `   ⚠️  User Pool ID doesn't start with region (${COGNITO_REGION})`
  );
} else {
  console.log(`   ✅ User Pool ID format is correct`);
}

// Check domain format
if (!cleanDomain.includes(".")) {
  console.log(`   ❌ Cognito domain format appears invalid: ${cleanDomain}`);
} else {
  console.log(`   ✅ Cognito domain format appears valid`);
}

// Check redirect URI format
try {
  new URL(OAUTH_REDIRECT_URI);
  console.log(`   ✅ Redirect URI format is valid`);
} catch (error) {
  console.log(`   ❌ Redirect URI format is invalid: ${error.message}`);
}

console.log("\n🏁 Cognito connectivity test completed.");
