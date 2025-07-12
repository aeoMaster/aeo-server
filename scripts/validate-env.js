#!/usr/bin/env node

/**
 * Environment Variables Validation Script
 *
 * This script validates that all required environment variables are set
 * and provides helpful feedback for missing variables.
 */

const fs = require("fs");
const path = require("path");

// Colors for console output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

// Required environment variables by category
const requiredEnvVars = {
  "Basic Operation": ["NODE_ENV", "PORT", "MONGODB_URI", "JWT_SECRET"],
  Authentication: [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "LINKEDIN_CLIENT_ID",
    "LINKEDIN_CLIENT_SECRET",
  ],
  "AI Features": ["OPENAI_API_KEY"],
  Payments: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  Email: ["SENDGRID_API_KEY", "SENDGRID_FROM_EMAIL"],
  "Frontend Integration": ["CLIENT_URL", "FRONTEND_URL"],
};

// Optional environment variables
const optionalEnvVars = [
  "PAGESPEED_API_KEY",
  "SENDGRID_TEMPLATE_IDS",
  "USE_MOCK_EMAIL",
  "JWT_EXPIRES_IN",
];

function printHeader() {
  console.log(
    `${colors.bold}${colors.blue}========================================${colors.reset}`
  );
  console.log(
    `${colors.bold}${colors.blue}  Environment Variables Validation${colors.reset}`
  );
  console.log(
    `${colors.bold}${colors.blue}========================================${colors.reset}\n`
  );
}

function printSection(title) {
  console.log(`${colors.bold}${colors.yellow}${title}${colors.reset}`);
  console.log(`${colors.yellow}${"=".repeat(title.length)}${colors.reset}`);
}

function validateEnvVars() {
  const missing = [];
  const present = [];
  const warnings = [];

  // Check required environment variables
  Object.entries(requiredEnvVars).forEach(([category, vars]) => {
    printSection(category);

    vars.forEach((varName) => {
      const value = process.env[varName];

      if (!value) {
        missing.push({ category, name: varName });
        console.log(`  ${colors.red}❌ ${varName}${colors.reset} - Missing`);
      } else {
        present.push({ category, name: varName });

        // Check for placeholder values
        if (value.includes("your-") || value.includes("placeholder")) {
          warnings.push({ category, name: varName, value });
          console.log(
            `  ${colors.yellow}⚠️  ${varName}${colors.reset} - Set but appears to be placeholder`
          );
        } else {
          console.log(`  ${colors.green}✅ ${varName}${colors.reset} - Set`);
        }
      }
    });
    console.log("");
  });

  // Check optional environment variables
  printSection("Optional Variables");
  optionalEnvVars.forEach((varName) => {
    const value = process.env[varName];
    if (value) {
      console.log(`  ${colors.green}✅ ${varName}${colors.reset} - Set`);
    } else {
      console.log(
        `  ${colors.blue}ℹ️  ${varName}${colors.reset} - Not set (optional)`
      );
    }
  });
  console.log("");

  return { missing, present, warnings };
}

function printSummary(missing, present, warnings) {
  printSection("Summary");

  const totalRequired = Object.values(requiredEnvVars).flat().length;
  const totalPresent = present.length;
  const totalMissing = missing.length;
  const totalWarnings = warnings.length;

  console.log(
    `Required Variables: ${colors.green}${totalPresent}${colors.reset}/${colors.bold}${totalRequired}${colors.reset} set`
  );
  console.log(`Missing Variables: ${colors.red}${totalMissing}${colors.reset}`);
  console.log(`Warnings: ${colors.yellow}${totalWarnings}${colors.reset}`);

  if (totalMissing === 0 && totalWarnings === 0) {
    console.log(
      `\n${colors.green}${colors.bold}🎉 All environment variables are properly configured!${colors.reset}`
    );
    return true;
  } else {
    console.log(
      `\n${colors.red}${colors.bold}❌ Environment configuration needs attention${colors.reset}`
    );
    return false;
  }
}

function printMissingDetails(missing) {
  if (missing.length === 0) return;

  printSection("Missing Variables Details");

  const grouped = missing.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item.name);
    return acc;
  }, {});

  Object.entries(grouped).forEach(([category, vars]) => {
    console.log(`${colors.red}${category}:${colors.reset}`);
    vars.forEach((varName) => {
      console.log(`  - ${colors.red}${varName}${colors.reset}`);
    });
    console.log("");
  });
}

function printWarningDetails(warnings) {
  if (warnings.length === 0) return;

  printSection("Warning Details");

  warnings.forEach((warning) => {
    console.log(
      `${colors.yellow}⚠️  ${warning.name}${colors.reset} in ${warning.category}`
    );
    console.log(
      `   Current value: ${colors.yellow}${warning.value}${colors.reset}`
    );
    console.log(`   Action: Replace with actual value\n`);
  });
}

function printNextSteps(missing, warnings) {
  if (missing.length === 0 && warnings.length === 0) return;

  printSection("Next Steps");

  if (missing.length > 0) {
    console.log(
      `${colors.red}1. Set missing environment variables:${colors.reset}`
    );
    console.log(`   - Copy env.template to .env`);
    console.log(`   - Fill in the missing values`);
    console.log(`   - See ENVIRONMENT_SETUP.md for detailed instructions\n`);
  }

  if (warnings.length > 0) {
    console.log(
      `${colors.yellow}2. Replace placeholder values:${colors.reset}`
    );
    console.log(`   - Update variables with placeholder values`);
    console.log(`   - Use actual API keys and secrets\n`);
  }

  console.log(`${colors.blue}3. For production deployment:${colors.reset}`);
  console.log(`   - Set variables in Elastic Beanstalk environment`);
  console.log(`   - Use production API keys and secrets`);
  console.log(`   - Update frontend URLs to production domains\n`);
}

function checkEnvFile() {
  const envPath = path.join(process.cwd(), ".env");

  if (fs.existsSync(envPath)) {
    console.log(`${colors.green}✅ .env file found${colors.reset}`);
    return true;
  } else {
    console.log(`${colors.red}❌ .env file not found${colors.reset}`);
    console.log(`   Create one by copying env.template:`);
    console.log(`   ${colors.blue}cp env.template .env${colors.reset}\n`);
    return false;
  }
}

// Main execution
function main() {
  printHeader();

  const envFileExists = checkEnvFile();
  console.log("");

  const { missing, present, warnings } = validateEnvVars();
  const isValid = printSummary(missing, present, warnings);

  if (!isValid) {
    printMissingDetails(missing);
    printWarningDetails(warnings);
    printNextSteps(missing, warnings);
  }

  console.log(
    `${colors.bold}${colors.blue}========================================${colors.reset}\n`
  );

  // Exit with appropriate code
  process.exit(isValid ? 0 : 1);
}

// Run the validation
main();
