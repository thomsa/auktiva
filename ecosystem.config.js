module.exports = {
  apps: [
    {
      name: "auktiva",
      script: "npm",
      args: "start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
    },
    // Soketi WebSocket server for realtime features (optional)
    // NOTE: Soketi doesn't support Node.js 20+, so use Docker instead
    //
    // For production, run Soketi as a Docker container (NOT via PM2):
    //   docker run -d --name soketi --restart unless-stopped \
    //     -p 6001:6001 \
    //     -e SOKETI_DEFAULT_APP_ID=auktiva \
    //     -e SOKETI_DEFAULT_APP_KEY=your-key \
    //     -e SOKETI_DEFAULT_APP_SECRET=your-secret \
    //     quay.io/soketi/soketi:latest
    //
    // Or if you have Node 18, you can use native Soketi with PM2:
    // {
    //   name: "soketi",
    //   script: "soketi",
    //   args: "start",
    //   interpreter: "/path/to/node18/bin/node",
    //   env: {
    //     SOKETI_DEFAULT_APP_ID: process.env.SOKETI_APP_ID,
    //     SOKETI_DEFAULT_APP_KEY: process.env.SOKETI_APP_KEY,
    //     SOKETI_DEFAULT_APP_SECRET: process.env.SOKETI_APP_SECRET,
    //     SOKETI_PORT: process.env.SOKETI_PORT || "6001",
    //   },
    // },
  ],
};
