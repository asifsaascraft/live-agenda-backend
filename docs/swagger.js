
import swaggerJsdoc from "swagger-jsdoc";

import paths from "./index.js";
import schemas from "./schemas.js";

// ==========================================
// SWAGGER SERVER URLS
// ==========================================

const localUrl = `http://localhost:${process.env.PORT || 5000}/api`;

const servers = [
  {
    url: localUrl,
    description: "Local Development",
  },
];

// Production API URL

if (process.env.API_BASE_URL) {
  const productionUrl = process.env.API_BASE_URL.replace(
    /\/+$/,
    ""
  );

  servers.push({
    url: `${productionUrl}/api`,
    description: "Production",
  });
}

// ==========================================
// SWAGGER CONFIGURATION
// ==========================================

const options = {
  definition: {
    openapi: "3.0.3",

    info: {
      title: "Live Agenda API",
      version: "1.0.0",
      description:
        "Official REST API documentation for the Live Agenda Backend. The system has one admin account for managing the platform. Public APIs can be accessed without authentication, while admin management APIs require JWT authentication.",
    },

    servers,

    tags: [
      {
        name: "Authentication",
        description:
          "One-time admin setup, admin login, token management and password recovery.",
      },

      {
        name: "Admin",
        description:
          "Protected administrative APIs for managing Live Agenda.",
      },

      {
        name: "Public",
        description:
          "Public APIs accessible without admin authentication.",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Enter the admin access token received from the login endpoint.",
        },
      },

      schemas,
    },

    paths,
  },

  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
