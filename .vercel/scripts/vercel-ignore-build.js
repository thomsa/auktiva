// .vercel/scripts/vercel-ignore-build.js
// eslint-disable-next-line @typescript-eslint/no-require-imports
const https = require("https");

const VERCEL_URL = process.env.VERCEL_URL;
const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

// If no URL available, allow build
if (!VERCEL_URL) {
  console.log("⚠️  No VERCEL_URL found, allowing build");
  process.exit(1);
}

// If no API token, allow build
if (!VERCEL_API_TOKEN) {
  console.log("⚠️  No VERCEL_API_TOKEN found, allowing build");
  process.exit(1);
}

const options = {
  hostname: "api.vercel.com",
  port: 443,
  path: `/v13/deployments/${VERCEL_URL}${
    VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ""
  }`,
  method: "GET",
  headers: {
    Authorization: `Bearer ${VERCEL_API_TOKEN}`,
  },
};

let data = "";

const req = https.request(options, (res) => {
  res.on("data", (d) => {
    data += d.toString();
  });

  res.on("end", () => {
    try {
      const parsedData = JSON.parse(data);

      // Check if this deployment was triggered by a deploy hook
      const isDeployHook =
        parsedData.meta?.deployHookId || parsedData.meta?.deployHookName;

      console.log("Deployment info:", {
        target: parsedData.target,
        deployHookId: parsedData.meta?.deployHookId,
        deployHookName: parsedData.meta?.deployHookName,
      });

      if (isDeployHook) {
        console.log("✅ Deploy hook detected - Build will proceed");
        process.exit(1); // Exit 1 = proceed with build
      } else {
        console.log("🛑 Git push detected - Build cancelled");
        process.exit(0); // Exit 0 = skip build
      }
    } catch (error) {
      console.error("Error parsing response:", error);
      console.log("⚠️  Error occurred, allowing build to proceed");
      process.exit(1);
    }
  });
});

req.on("error", (error) => {
  console.error("Request error:", error);
  console.log("⚠️  Error occurred, allowing build to proceed");
  process.exit(1);
});

req.end();
