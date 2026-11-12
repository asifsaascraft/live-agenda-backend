
const sessionPaths = {
  // ==========================================
  // CREATE SESSION
  // POST /api/sessions
  // ==========================================

  "/sessions": {
    post: {
      tags: ["Admin - Sessions"],
      summary: "Create a new session",
      description:
        "Creates a new session with session details and chairpersons. Requires Admin authentication.",

      security: [{ bearerAuth: [] }],

      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: [
                "sessionName",
                "sessionDate",
                "startTime",
                "endTime",
                "chairperson",
              ],
              properties: {
                sessionName: {
                  type: "string",
                  minLength: 2,
                  maxLength: 100,
                  example: "Inauguration Session",
                },
                sessionDate: {
                  type: "string",
                  format: "date-time",
                  example: "2026-11-12T00:00:00+05:30",
                },
                startTime: {
                  type: "string",
                  example: "10:00 AM",
                },
                endTime: {
                  type: "string",
                  example: "11:00 AM",
                },
                chairperson: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "string",
                    example: "672b12345678901234567892",
                  },
                },
              },
            },

            example: {
              sessionName: "Inauguration Session",
              sessionDate: "2026-11-12T00:00:00+05:30",
              startTime: "10:00 AM",
              endTime: "11:00 AM",
              chairperson: [
                "672b12345678901234567892",
              ],
            },
          },
        },
      },

      responses: {
        201: {
          description: "Session created successfully.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Session created successfully.",
                  },
                  data: {
                    type: "object",
                    properties: {
                      session: {
                        $ref: "#/components/schemas/Session",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Validation error.",
        },
        401: {
          description: "Unauthorized.",
        },
        500: {
          description: "Internal server error.",
        },
      },
    },

    // ==========================================
    // GET ALL SESSIONS WITH PAGINATION
    // ==========================================

    get: {
      tags: ["Admin - Sessions"],
      summary: "Get all sessions with pagination",
      description:
        "Returns all sessions with pagination, searching, sorting, and populated chairperson details.",

      security: [{ bearerAuth: [] }],

      parameters: [
        {
          name: "page",
          in: "query",
          schema: {
            type: "integer",
            default: 1,
            minimum: 1,
          },
          description: "Page number.",
        },
        {
          name: "limit",
          in: "query",
          schema: {
            type: "integer",
            default: 20,
            minimum: 1,
            maximum: 100,
          },
          description: "Number of sessions per page. Maximum 100.",
        },
        {
          name: "search",
          in: "query",
          schema: {
            type: "string",
          },
          description:
            "Search sessions by session name, start time, or end time.",
          example: "Inauguration",
        },
        {
          name: "sortBy",
          in: "query",
          schema: {
            type: "string",
            enum: [
              "sessionName",
              "sessionDate",
              "startTime",
              "endTime",
              "createdAt",
              "updatedAt",
            ],
            default: "sessionDate",
          },
          description: "Field used to sort sessions.",
        },
        {
          name: "order",
          in: "query",
          schema: {
            type: "string",
            enum: ["asc", "desc"],
            default: "desc",
          },
          description: "Sorting order.",
        },
      ],

      responses: {
        200: {
          description: "Sessions fetched successfully.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Sessions fetched successfully.",
                  },
                  data: {
                    type: "object",
                    properties: {
                      sessions: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/Session",
                        },
                      },
                    },
                  },
                  pagination: {
                    type: "object",
                    properties: {
                      page: {
                        type: "integer",
                        example: 1,
                      },
                      limit: {
                        type: "integer",
                        example: 20,
                      },
                      total: {
                        type: "integer",
                        example: 50,
                      },
                      totalPages: {
                        type: "integer",
                        example: 3,
                      },
                      from: {
                        type: "integer",
                        example: 1,
                      },
                      to: {
                        type: "integer",
                        example: 20,
                      },
                      hasPreviousPage: {
                        type: "boolean",
                        example: false,
                      },
                      hasNextPage: {
                        type: "boolean",
                        example: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        401: {
          description: "Unauthorized.",
        },
        500: {
          description: "Internal server error.",
        },
      },
    },
  },

  // ==========================================
  // GET ALL SESSIONS WITHOUT PAGINATION
  // GET /api/sessions/all
  // ==========================================

  "/sessions/all": {
    get: {
      tags: ["Admin - Sessions"],
      summary: "Get all sessions without pagination",
      description:
        "Returns all sessions without pagination, with optional searching, sorting, and populated chairperson details.",

      security: [{ bearerAuth: [] }],

      parameters: [
        {
          name: "search",
          in: "query",
          schema: {
            type: "string",
          },
          description:
            "Search sessions by session name, start time, or end time.",
          example: "Inauguration",
        },
        {
          name: "sortBy",
          in: "query",
          schema: {
            type: "string",
            enum: [
              "sessionName",
              "sessionDate",
              "startTime",
              "endTime",
              "createdAt",
              "updatedAt",
            ],
            default: "sessionDate",
          },
          description: "Field used to sort sessions.",
        },
        {
          name: "order",
          in: "query",
          schema: {
            type: "string",
            enum: ["asc", "desc"],
            default: "desc",
          },
          description: "Sorting order.",
        },
      ],

      responses: {
        200: {
          description: "Sessions fetched successfully.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Sessions fetched successfully.",
                  },
                  data: {
                    type: "object",
                    properties: {
                      sessions: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/Session",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        401: {
          description: "Unauthorized.",
        },
        500: {
          description: "Internal server error.",
        },
      },
    },
  },

  // ==========================================
  // GET, UPDATE AND DELETE SESSION BY ID
  // ==========================================

  "/sessions/{id}": {
    // ==========================================
    // GET SESSION BY ID
    // ==========================================

    get: {
      tags: ["Admin - Sessions"],
      summary: "Get session by ID",
      description:
        "Fetches a single session using its MongoDB ID with populated chairperson details.",

      security: [{ bearerAuth: [] }],

      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "MongoDB Session ID.",
          example: "672b12345678901234567893",
        },
      ],

      responses: {
        200: {
          description: "Session fetched successfully.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Session fetched successfully.",
                  },
                  data: {
                    type: "object",
                    properties: {
                      session: {
                        $ref: "#/components/schemas/Session",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Invalid session ID.",
        },
        401: {
          description: "Unauthorized.",
        },
        404: {
          description: "Session not found.",
        },
        500: {
          description: "Internal server error.",
        },
      },
    },

    // ==========================================
    // UPDATE SESSION
    // ==========================================

    put: {
      tags: ["Admin - Sessions"],
      summary: "Update session",
      description:
        "Updates session name, date, time, or chairpersons. Requires Admin authentication.",

      security: [{ bearerAuth: [] }],

      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "MongoDB Session ID.",
          example: "672b12345678901234567893",
        },
      ],

      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              minProperties: 1,
              properties: {
                sessionName: {
                  type: "string",
                  minLength: 2,
                  maxLength: 100,
                  example: "Updated Inauguration Session",
                },
                sessionDate: {
                  type: "string",
                  format: "date-time",
                  example: "2026-11-13T00:00:00+05:30",
                },
                startTime: {
                  type: "string",
                  example: "11:00 AM",
                },
                endTime: {
                  type: "string",
                  example: "12:00 PM",
                },
                chairperson: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "string",
                    example: "672b12345678901234567892",
                  },
                },
              },
            },

            examples: {
              updateName: {
                summary: "Update session name",
                value: {
                  sessionName: "Updated Inauguration Session",
                },
              },
              updateDate: {
                summary: "Update session date",
                value: {
                  sessionDate: "2026-11-13T00:00:00+05:30",
                },
              },
              updateTime: {
                summary: "Update session time",
                value: {
                  startTime: "11:00 AM",
                  endTime: "12:00 PM",
                },
              },
              updateChairperson: {
                summary: "Update chairpersons",
                value: {
                  chairperson: [
                    "672b12345678901234567892",
                  ],
                },
              },
              updateAll: {
                summary: "Update all session details",
                value: {
                  sessionName: "Updated Inauguration Session",
                  sessionDate: "2026-11-13T00:00:00+05:30",
                  startTime: "11:00 AM",
                  endTime: "12:00 PM",
                  chairperson: [
                    "672b12345678901234567892",
                  ],
                },
              },
            },
          },
        },
      },

      responses: {
        200: {
          description: "Session updated successfully.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Session updated successfully.",
                  },
                  data: {
                    type: "object",
                    properties: {
                      session: {
                        $ref: "#/components/schemas/Session",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Validation error or invalid session ID.",
        },
        401: {
          description: "Unauthorized.",
        },
        404: {
          description: "Session not found.",
        },
        500: {
          description: "Internal server error.",
        },
      },
    },

    // ==========================================
    // DELETE SESSION
    // ==========================================

    delete: {
      tags: ["Admin - Sessions"],
      summary: "Delete session",
      description:
        "Permanently deletes a session using its MongoDB ID.",

      security: [{ bearerAuth: [] }],

      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "MongoDB Session ID.",
          example: "672b12345678901234567893",
        },
      ],

      responses: {
        200: {
          description: "Session deleted successfully.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Session deleted successfully.",
                  },
                  data: {
                    type: "object",
                    properties: {
                      session: {
                        $ref: "#/components/schemas/Session",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Invalid session ID.",
        },
        401: {
          description: "Unauthorized.",
        },
        404: {
          description: "Session not found.",
        },
        500: {
          description: "Internal server error.",
        },
      },
    },
  },
};

export default sessionPaths;
