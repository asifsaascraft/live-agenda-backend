
export const schemas = {
  // ==========================================
  // ADMIN SCHEMA
  // ==========================================

  Admin: {
    type: "object",
    properties: {
      id: {
        type: "string",
        example: "primary-admin",
      },

      name: {
        type: "string",
        example: "Asif Jamal",
      },

      email: {
        type: "string",
        format: "email",
        example: "admin@example.com",
      },

      createdAt: {
        type: "string",
        format: "date-time",
        example: "2026-11-11T10:00:00.000Z",
      },
    },
  },

  // ==========================================
  // ADMIN SETUP RESPONSE
  // ==========================================

  AdminSetupResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },

      message: {
        type: "string",
        example:
          "Admin account created successfully. Please login.",
      },

      data: {
        type: "object",
        properties: {
          admin: {
            $ref: "#/components/schemas/Admin",
          },
        },
      },
    },
  },

  // ==========================================
  // ADMIN AUTH RESPONSE
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
        example: "Admin login successful.",
      },

      data: {
        type: "object",
        properties: {
          admin: {
            $ref: "#/components/schemas/Admin",
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
        example:
          "Access token refreshed successfully.",
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
  // GENERIC MESSAGE RESPONSE
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
