
const trackPaths = {
  // ==========================================
  // CREATE TRACK
  // POST /api/tracks
  // ==========================================

  "/tracks": {
    post: {
      tags: ["Admin - Tracks"],
      summary: "Create a new track",
      description: "Creates a new track. Requires Admin authentication.",
      security: [{ bearerAuth: [] }],

      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/CreateTrackRequest",
            },
            example: {
              trackName: "General Medicine",
              status: "Active",
            },
          },
        },
      },

      responses: {
        201: {
          description: "Track created successfully.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/TrackResponse",
              },
            },
          },
        },
        400: {
          description: "Validation error.",
        },
        401: {
          description: "Unauthorized. Admin authentication required.",
        },
        500: {
          description: "Internal server error.",
        },
      },
    },

    // ==========================================
    // GET ALL TRACKS WITH PAGINATION
    // ==========================================

    get: {
      tags: ["Admin - Tracks"],
      summary: "Get all tracks with pagination",
      description:
        "Returns all tracks with pagination, filtering, searching, and sorting.",

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
          description: "Number of tracks per page. Maximum 100.",
        },
        {
          name: "search",
          in: "query",
          schema: {
            type: "string",
          },
          description: "Search tracks by track name.",
          example: "medicine",
        },
        {
          name: "status",
          in: "query",
          schema: {
            type: "string",
            enum: ["Active", "Inactive"],
          },
          description: "Filter tracks by status.",
        },
        {
          name: "sortBy",
          in: "query",
          schema: {
            type: "string",
            enum: [
              "trackName",
              "status",
              "createdAt",
              "updatedAt",
            ],
            default: "createdAt",
          },
          description: "Field used to sort tracks.",
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
          description: "Tracks fetched successfully.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/PaginatedTracksResponse",
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
  // GET ACTIVE TRACKS WITH PAGINATION
  // GET /api/tracks/active
  // ==========================================

  "/tracks/active": {
    get: {
      tags: ["Admin - Tracks"],
      summary: "Get active tracks with pagination",
      description:
        "Returns only Active tracks with pagination, searching, and sorting.",

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
          description: "Number of tracks per page.",
        },
        {
          name: "search",
          in: "query",
          schema: {
            type: "string",
          },
          description: "Search active tracks by track name.",
          example: "medicine",
        },
        {
          name: "sortBy",
          in: "query",
          schema: {
            type: "string",
            enum: [
              "trackName",
              "status",
              "createdAt",
              "updatedAt",
            ],
            default: "createdAt",
          },
          description: "Field used to sort tracks.",
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
          description: "Active tracks fetched successfully.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/PaginatedTracksResponse",
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
  // GET ALL ACTIVE TRACKS WITHOUT PAGINATION
  // GET /api/tracks/active/all
  // ==========================================

  "/tracks/active/all": {
    get: {
      tags: ["Admin - Tracks"],
      summary: "Get all active tracks without pagination",
      description:
        "Returns all Active tracks without pagination, with optional searching and sorting.",

      security: [{ bearerAuth: [] }],

      parameters: [
        {
          name: "search",
          in: "query",
          schema: {
            type: "string",
          },
          description: "Search active tracks by track name.",
          example: "medicine",
        },
        {
          name: "sortBy",
          in: "query",
          schema: {
            type: "string",
            enum: [
              "trackName",
              "status",
              "createdAt",
              "updatedAt",
            ],
            default: "trackName",
          },
          description: "Field used to sort tracks.",
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
          description: "Active tracks fetched successfully.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/TracksResponse",
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
  // GET, UPDATE AND DELETE TRACK BY ID
  // ==========================================

  "/tracks/{id}": {
    // ==========================================
    // GET TRACK BY ID
    // ==========================================

    get: {
      tags: ["Admin - Tracks"],
      summary: "Get track by ID",
      description: "Fetches a single track using its MongoDB ID.",

      security: [{ bearerAuth: [] }],

      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "MongoDB Track ID.",
          example: "672b12345678901234567890",
        },
      ],

      responses: {
        200: {
          description: "Track fetched successfully.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/TrackResponse",
              },
            },
          },
        },
        400: {
          description: "Invalid track ID.",
        },
        401: {
          description: "Unauthorized.",
        },
        404: {
          description: "Track not found.",
        },
        500: {
          description: "Internal server error.",
        },
      },
    },

    // ==========================================
    // UPDATE TRACK
    // ==========================================

    put: {
      tags: ["Admin - Tracks"],
      summary: "Update track",
      description:
        "Updates track name, status, or both. Requires Admin authentication.",

      security: [{ bearerAuth: [] }],

      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "MongoDB Track ID.",
          example: "672b12345678901234567890",
        },
      ],

      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/UpdateTrackRequest",
            },
            examples: {
              updateName: {
                summary: "Update track name",
                value: {
                  trackName: "Updated General Medicine",
                },
              },
              updateStatus: {
                summary: "Update track status",
                value: {
                  status: "Inactive",
                },
              },
              updateBoth: {
                summary: "Update track name and status",
                value: {
                  trackName: "Updated General Medicine",
                  status: "Inactive",
                },
              },
            },
          },
        },
      },

      responses: {
        200: {
          description: "Track updated successfully.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/TrackResponse",
              },
            },
          },
        },
        400: {
          description: "Validation error or invalid track ID.",
        },
        401: {
          description: "Unauthorized.",
        },
        404: {
          description: "Track not found.",
        },
        500: {
          description: "Internal server error.",
        },
      },
    },

    // ==========================================
    // DELETE TRACK
    // ==========================================

    delete: {
      tags: ["Admin - Tracks"],
      summary: "Delete track",
      description:
        "Permanently deletes a track using its MongoDB ID.",

      security: [{ bearerAuth: [] }],

      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "MongoDB Track ID.",
          example: "672b12345678901234567890",
        },
      ],

      responses: {
        200: {
          description: "Track deleted successfully.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/TrackResponse",
              },
            },
          },
        },
        400: {
          description: "Invalid track ID.",
        },
        401: {
          description: "Unauthorized.",
        },
        404: {
          description: "Track not found.",
        },
        500: {
          description: "Internal server error.",
        },
      },
    },
  },
};

export default trackPaths;
