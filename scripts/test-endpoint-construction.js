#!/usr/bin/env node

/**
 * Test Endpoint Construction Script
 *
 * This script tests how the Cognito endpoints are being constructed
 * to help debug URL issues.
 */

require("dotenv").config();

const COGNITO_REGION = process.env.COGNITO_REGION || "us-east-1";
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN;

console.log("🔍 Testing Endpoint Construction...\n");

console.log("📋 Environment Variables:");
console.log(`   COGNITO_REGION: ${COGNITO_REGION}`);
console.log(
  `   COGNITO_USER_POOL_ID: ${COGNITO_USER_POOL_ID?.substring(0, 20)}...`
);
console.log(`   COGNITO_DOMAIN: ${COGNITO_DOMAIN}`);

if (!COGNITO_DOMAIN || !COGNITO_USER_POOL_ID) {
  console.error("❌ Missing required environment variables");
  process.exit(1);
}

// Simulate the current logic
function getCognitoEndpoints(domain, region, userPoolId) {
  // Handle both cases: domain with or without https:// prefix
  let cleanDomain = domain;
  if (domain.startsWith("https://")) {
    cleanDomain = domain.replace("https://", "");
  }

  // Construct JWKS endpoint - ensure proper format
  const jwksEndpoint = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;

  // Use the domain as-is if it already has protocol, otherwise add https://
  let baseUrl;
  if (domain.startsWith("https://")) {
    baseUrl = domain; // Use domain as-is if it already has https://
  } else {
    baseUrl = `https://${cleanDomain}`;
  }

  return {
    authorization: `${baseUrl}/login`,
    token: `${baseUrl}/oauth2/token`,
    logout: `${baseUrl}/logout`,
    jwks: jwksEndpoint,
  };
}

console.log("\n🔧 Constructing Endpoints:");

const endpoints = getCognitoEndpoints(
  COGNITO_DOMAIN,
  COGNITO_REGION,
  COGNITO_USER_POOL_ID
);

console.log("\n📋 Generated Endpoints:");
Object.entries(endpoints).forEach(([key, url]) => {
  console.log(`   ${key}: ${url}`);
});

// Test if URLs are valid
console.log("\n🔍 Validating URLs:");
Object.entries(endpoints).forEach(([key, url]) => {
  try {
    new URL(url);
    console.log(`   ✅ ${key}: Valid URL`);
  } catch (error) {
    console.log(`   ❌ ${key}: Invalid URL - ${error.message}`);
  }
});

// Test with different domain formats
console.log("\n🧪 Testing Different Domain Formats:");

const testDomains = [
  "us-east-1ygtgnpk2o.auth.us-east-1.amazoncognito.com",
  "https://us-east-1ygtgnpk2o.auth.us-east-1.amazoncognito.com",
  "http://us-east-1ygtgnpk2o.auth.us-east-1.amazoncognito.com",
];

testDomains.forEach((testDomain) => {
  console.log(`\n   Testing domain: ${testDomain}`);
  const testEndpoints = getCognitoEndpoints(
    testDomain,
    COGNITO_REGION,
    COGNITO_USER_POOL_ID
  );
  console.log(`   Token URL: ${testEndpoints.token}`);

  try {
    new URL(testEndpoints.token);
    console.log(`   ✅ Valid URL`);
  } catch (error) {
    console.log(`   ❌ Invalid URL - ${error.message}`);
  }
});

console.log("\n🏁 Endpoint construction test completed.");
