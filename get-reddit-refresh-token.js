const fetch = require("node-fetch");

async function getRefreshToken() {
  const CLIENT_ID = "qMqysl5CfkLAIOLlw9mFZg";
  const CLIENT_SECRET = "GroKqGH4NfsUFM0qm66cSXf-eU7tEQ";
  const REDIRECT_URI = "http://localhost:8080";

  console.log("🔧 Reddit Refresh Token Generator");
  console.log("================================");
  console.log("");
  console.log("Step 1: Visit this URL in your browser:");
  console.log(
    `https://www.reddit.com/api/v1/authorize?client_id=${CLIENT_ID}&response_type=code&state=random123&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=submit%20identity%20read&duration=permanent`
  );
  console.log("");
  console.log("Step 2: After authorizing, you'll be redirected to:");
  console.log(`${REDIRECT_URI}?code=AUTHORIZATION_CODE&state=random123`);
  console.log("");
  console.log("Step 3: Copy the authorization code and paste it below:");

  // In a real scenario, you'd use a proper input method
  // For now, just show the instructions
  console.log("");
  console.log(
    "Step 4: Once you have the code, run this script with the code as an argument"
  );
  console.log(
    "Example: node get-reddit-refresh-token.js YOUR_AUTHORIZATION_CODE"
  );
  console.log("");
  console.log(
    "The script will exchange the code for a refresh token and show you what to add to your .env file"
  );
}

// If a code is provided as argument, exchange it for tokens
async function exchangeCodeForTokens(code) {
  const CLIENT_ID = "qMqysl5CfkLAIOLlw9mFZg";
  const CLIENT_SECRET = "GroKqGH4NfsUFM0qm66cSXf-eU7tEQ";
  const REDIRECT_URI = "http://localhost:8080";

  try {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
      "base64"
    );

    const response = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "AEO-Reddit-Bot/1.0",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Failed to exchange code for tokens:", error);
      return;
    }

    const data = await response.json();

    console.log("✅ Success! Add these to your .env file:");
    console.log("");
    console.log(`REDDIT_REFRESH_TOKEN=${data.refresh_token}`);
    console.log(`REDDIT_ACCESS_TOKEN=${data.access_token}`);
    console.log(
      `REDDIT_EXPIRES_AT=${new Date(Date.now() + data.expires_in * 1000).toISOString()}`
    );
    console.log("");
    console.log(
      "Note: The access token will expire in 1 hour, but the refresh token is permanent."
    );
    console.log(
      "The system will automatically refresh the access token when needed."
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Check if authorization code is provided
const authCode = process.argv[2];

if (authCode) {
  exchangeCodeForTokens(authCode);
} else {
  getRefreshToken();
}
