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

  Hall: {
    type: "object",
    properties: {
      _id: {
        type: "string",
        example: "672b12345678901234567890",
      },
      hallName: {
        type: "string",
        example: "Main Auditorium",
      },
      status: {
        type: "string",
        enum: ["Active", "Inactive"],
        example: "Active",
      },
      createdAt: {
        type: "string",
        format: "date-time",
      },
      updatedAt: {
        type: "string",
        format: "date-time",
      },
    },
  },

  // ==========================================
  // TRACK SCHEMA
  // ==========================================

  Track: {
    type: "object",
    properties: {
      _id: {
        type: "string",
        example: "672b12345678901234567891",
      },

      trackName: {
        type: "string",
        example: "General Medicine",
      },

      status: {
        type: "string",
        enum: ["Active", "Inactive"],
        example: "Active",
      },

      createdAt: {
        type: "string",
        format: "date-time",
        example: "2026-11-11T10:00:00.000Z",
      },

      updatedAt: {
        type: "string",
        format: "date-time",
        example: "2026-11-11T10:00:00.000Z",
      },
    },
  },

  // ==========================================
  // FACULTY SCHEMA
  // ==========================================

  Faculty: {
    type: "object",
    properties: {
      _id: {
        type: "string",
        example: "672b12345678901234567892",
      },

      fullName: {
        type: "string",
        example: "Dr. Asif Jamal",
      },

      email: {
        type: "string",
        format: "email",
        example: "asif@example.com",
      },

      mobile: {
        type: "string",
        example: "9876543210",
      },

      createdAt: {
        type: "string",
        format: "date-time",
        example: "2026-11-11T10:00:00.000Z",
      },

      updatedAt: {
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
        example: "Admin account created successfully. Please login.",
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
