const fetch = require("node-fetch");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function setupReddit() {
  console.log("🔧 Reddit Auto Setup");
  console.log("===================");
  console.log("");

  // Step 1: Show the authorization URL
  const authUrl =
    "https://www.reddit.com/api/v1/authorize?client_id=qMqysl5CfkLAIOLlw9mFZg&response_type=code&state=random123&redirect_uri=http%3A%2F%2Flocalhost%3A8080&scope=submit%20identity%20read&duration=permanent";

  console.log("Step 1: Visit this URL in your browser:");
  console.log(authUrl);
  console.log("");
  console.log("Step 2: After authorizing, you'll be redirected to:");
  console.log("http://localhost:8080?code=AUTHORIZATION_CODE&state=random123");
  console.log("");
  console.log("Step 3: Copy the authorization code from the URL");
  console.log("");

  // Step 4: Get the authorization code from user
  const authCode = await new Promise((resolve) => {
    rl.question("Paste the authorization code here: ", (code) => {
      resolve(code.trim());
    });
  });

  if (!authCode) {
    console.log("❌ No authorization code provided");
    rl.close();
    return;
  }

  console.log("");
  console.log("🔄 Exchanging code for refresh token...");

  // Step 5: Exchange code for tokens
  try {
    const credentials = Buffer.from(
      "qMqysl5CfkLAIOLlw9mFZg:GroKqGH4NfsUFM0qm66cSXf-eU7tEQ"
    ).toString("base64");

    const response = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "AEO-Reddit-Bot/1.0",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: authCode,
        redirect_uri: "http://localhost:8080",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.log("❌ Failed to exchange code for tokens:", error);
      rl.close();
      return;
    }

    const data = await response.json();

    console.log("✅ Success! Here are your tokens:");
    console.log("");
    console.log("Add these to your .env file:");
    console.log("");
    console.log(`REDDIT_CLIENT_ID=qMqysl5CfkLAIOLlw9mFZg`);
    console.log(`REDDIT_CLIENT_SECRET=GroKqGH4NfsUFM0qm66cSXf-eU7tEQ`);
    console.log(`REDDIT_REFRESH_TOKEN=${data.refresh_token}`);
    console.log(`REDDIT_ACCESS_TOKEN=${data.access_token}`);
    console.log(
      `REDDIT_EXPIRES_AT=${new Date(Date.now() + data.expires_in * 1000).toISOString()}`
    );
    console.log("");

    // Step 6: Test the connection
    console.log("🧪 Testing Reddit connection...");

    const testResponse = await fetch(
      "http://localhost:8080/api/reddit/status",
      {
        headers: {
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NmFiZDRmZmNlMjViZTY5OTZhMTMwNSIsImlhdCI6MTc1MTgyNTc0NSwiZXhwIjoxNzUyNDMwNTQ1fQ.VIWw0MYmV0vxZrN5Q_DAkoD5ILZeAVDJv7jg6OI6-Zg",
        },
      }
    );

    if (testResponse.ok) {
      const status = await testResponse.json();
      if (status.configured) {
        console.log("✅ Reddit connection successful!");
        console.log(`👤 Username: ${status.accountInfo.username}`);
        console.log(`⭐ Karma: ${status.accountInfo.karma}`);
        console.log(`📅 Account Age: ${status.accountInfo.accountAge} days`);
        console.log("");
        console.log("🎉 You can now use the Reddit posting feature!");
      } else {
        console.log("⚠️  Reddit connection failed:", status.error);
        console.log(
          "Please restart your server after adding the tokens to .env"
        );
      }
    } else {
      console.log("⚠️  Could not test connection (server might need restart)");
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  rl.close();
}

setupReddit();
