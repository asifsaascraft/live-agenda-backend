
export const schemas = {
  // ==========================================
  // USER SCHEMA
  // ==========================================

  Admin: {
    type: "object",

    properties: {
      id: {
        type: "string",
        example: "6872bcd90123456789abcd12",
      },

      name: {
        type: "string",
        example: "Asif Jamal",
      },

      email: {
        type: "string",
        example: "asif@example.com",
      },

      role: {
        type: "string",
        enum: ["user", "admin"],
        example: "user",
      },

      createdAt: {
        type: "string",
        format: "date-time",
        example: "2026-11-11T10:00:00.000Z",
      },
    },
  },

  // ==========================================
  // AUTH SUCCESS RESPONSE
  // ==========================================

  AuthResponse: {
    type: "object",

    properties: {
      success: {
        type: "boolean",
        example: true,
      },

      message: {
        type: "string",
        example: "Login successful.",
      },

      data: {
        type: "object",

        properties: {
          user: {
            $ref: "#/components/schemas/User",
          },

          accessToken: {
            type: "string",
            example: "your_access_token",
          },
        },
      },
    },
  },

  // ==========================================
  // REFRESH TOKEN RESPONSE
  // ==========================================

  RefreshTokenResponse: {
    type: "object",

    properties: {
      success: {
        type: "boolean",
        example: true,
      },

      message: {
        type: "string",
        example: "Access token refreshed successfully.",
      },

      data: {
        type: "object",

        properties: {
          accessToken: {
            type: "string",
            example: "new_access_token",
          },
        },
      },
    },
  },

  // ==========================================
  // GENERIC RESPONSE
  // ==========================================

  MessageResponse: {
    type: "object",

    properties: {
      success: {
        type: "boolean",
        example: true,
      },

      message: {
        type: "string",
        example: "Operation successful.",
      },

      data: {
        nullable: true,
        example: null,
      },
    },
  },

  // ==========================================
  // ERROR RESPONSE
  // ==========================================

  ErrorResponse: {
    type: "object",

    properties: {
      success: {
        type: "boolean",
        example: false,
      },

      message: {
        type: "string",
        example: "Something went wrong.",
      },

      errors: {
        nullable: true,
        example: null,
      },

      data: {
        nullable: true,
        example: null,
      },
    },
  },
};

export default schemas;
