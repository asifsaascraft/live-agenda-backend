
import "dotenv/config";

import dns from "node:dns";

// Configure Google DNS before loading application modules.
dns.setServers([
  "8.8.8.8",
  "8.8.4.4",
]);

// Start backend after DNS configuration.
await import("./server.js");
