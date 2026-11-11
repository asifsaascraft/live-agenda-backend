
import swaggerJsdoc from "swagger-jsdoc";

import paths from "./index.js";
import schemas from "./schemas.js";

const localUrl =
  `http://localhost:${process.env.PORT || 5000}/api`;

const servers = [
  {
    url: localUrl,
    description: "Local Development",
  },
];

if (process.env.API_BASE_URL) {
  servers.push({
    url: `${process.env.API_BASE_URL.replace(/\/+$/, "")}/api`,
    description: "Production",
  });
}

const options = {
  definition: {
    openapi: "3.0.3",

    info: {
      title: "Live Agenda API",
      version: "1.0.0",
      description:
        "Official REST API documentation for the Live Agenda Backend.",
    },

    servers,

    tags: [
      {
        name: "Authentication",
        description: "Authentication and account management APIs.",
      },

      {
        name: "Admin",
        description: "Administrative APIs.",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
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
