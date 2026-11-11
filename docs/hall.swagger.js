
const hallPaths = {
  // ==========================================
  // CREATE HALL
  // POST /api/halls
  // ==========================================

  "/halls": {
    post: {
      tags: ["Admin - Halls"],
      summary: "Create a new hall",
      description: "Creates a new hall. Requires Admin authentication.",
      security: [{ bearerAuth: [] }],

      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/CreateHallRequest",
            },
            example: {
              hallName: "Main Auditorium",
              status: "Active",
            },
          },
        },
      },

      responses: {
        201: {
          description: "Hall created successfully.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/HallResponse",
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
    // GET ALL HALLS WITH PAGINATION
    // ==========================================

    get: {
      tags: ["Admin - Halls"],
      summary: "Get all halls with pagination",
      description:
        "Returns all halls with pagination, filtering, searching, and sorting.",

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
          description: "Number of halls per page. Maximum 100.",
        },
        {
          name: "search",
          in: "query",
          schema: {
            type: "string",
          },
          description: "Search halls by hall name.",
          example: "auditorium",
        },
        {
          name: "status",
          in: "query",
          schema: {
            type: "string",
            enum: ["Active", "Inactive"],
          },
          description: "Filter halls by status.",
        },
        {
          name: "sortBy",
          in: "query",
          schema: {
            type: "string",
            enum: [
              "hallName",
              "status",
              "createdAt",
              "updatedAt",
            ],
            default: "createdAt",
          },
          description: "Field used to sort halls.",
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
          description: "Halls fetched successfully.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/PaginatedHallsResponse",
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
  // GET ACTIVE HALLS WITH PAGINATION
  // GET /api/halls/active
  // ==========================================

  "/halls/active": {
    get: {
      tags: ["Admin - Halls"],
      summary: "Get active halls with pagination",
      description:
        "Returns only Active halls with pagination, searching, and sorting.",

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
          description: "Number of halls per page.",
        },
        {
          name: "search",
          in: "query",
          schema: {
            type: "string",
          },
          description: "Search active halls by hall name.",
          example: "main",
        },
        {
          name: "sortBy",
          in: "query",
          schema: {
            type: "string",
            enum: [
              "hallName",
              "status",
              "createdAt",
              "updatedAt",
            ],
            default: "createdAt",
          },
          description: "Field used to sort halls.",
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
          description: "Active halls fetched successfully.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/PaginatedHallsResponse",
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
  // GET ALL ACTIVE HALLS WITHOUT PAGINATION
  // GET /api/halls/active/all
  // ==========================================

  "/halls/active/all": {
    get: {
      tags: ["Admin - Halls"],
      summary: "Get all active halls without pagination",
      description:
        "Returns all Active halls without pagination, with optional searching and sorting.",

      security: [{ bearerAuth: [] }],

      parameters: [
        {
          name: "search",
          in: "query",
          schema: {
            type: "string",
          },
          description: "Search active halls by hall name.",
          example: "auditorium",
        },
        {
          name: "sortBy",
          in: "query",
          schema: {
            type: "string",
            enum: [
              "hallName",
              "status",
              "createdAt",
              "updatedAt",
            ],
            default: "hallName",
          },
          description: "Field used to sort halls.",
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
          description: "Active halls fetched successfully.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/HallsResponse",
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
  // GET, UPDATE AND DELETE HALL BY ID
  // ==========================================

  "/halls/{id}": {
    // ==========================================
    // GET HALL BY ID
    // ==========================================

    get: {
      tags: ["Admin - Halls"],
      summary: "Get hall by ID",
      description: "Fetches a single hall using its MongoDB ID.",

      security: [{ bearerAuth: [] }],

      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "MongoDB Hall ID.",
          example: "672b12345678901234567890",
        },
      ],

      responses: {
        200: {
          description: "Hall fetched successfully.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/HallResponse",
              },
            },
          },
        },
        400: {
          description: "Invalid hall ID.",
        },
        401: {
          description: "Unauthorized.",
        },
        404: {
          description: "Hall not found.",
        },
        500: {
          description: "Internal server error.",
        },
      },
    },

    // ==========================================
    // UPDATE HALL
    // ==========================================

    put: {
      tags: ["Admin - Halls"],
      summary: "Update hall",
      description:
        "Updates hall name, status, or both. Requires Admin authentication.",

      security: [{ bearerAuth: [] }],

      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "MongoDB Hall ID.",
          example: "672b12345678901234567890",
        },
      ],

      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/UpdateHallRequest",
            },
            examples: {
              updateName: {
                summary: "Update hall name",
                value: {
                  hallName: "Updated Main Auditorium",
                },
              },
              updateStatus: {
                summary: "Update hall status",
                value: {
                  status: "Inactive",
                },
              },
              updateBoth: {
                summary: "Update hall name and status",
                value: {
                  hallName: "Updated Main Auditorium",
                  status: "Inactive",
                },
              },
            },
          },
        },
      },

      responses: {
        200: {
          description: "Hall updated successfully.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/HallResponse",
              },
            },
          },
        },
        400: {
          description: "Validation error or invalid hall ID.",
        },
        401: {
          description: "Unauthorized.",
        },
        404: {
          description: "Hall not found.",
        },
        500: {
          description: "Internal server error.",
        },
      },
    },

    // ==========================================
    // DELETE HALL
    // ==========================================

    delete: {
      tags: ["Admin - Halls"],
      summary: "Delete hall",
      description:
        "Permanently deletes a hall using its MongoDB ID.",

      security: [{ bearerAuth: [] }],

      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "MongoDB Hall ID.",
          example: "672b12345678901234567890",
        },
      ],

      responses: {
        200: {
          description: "Hall deleted successfully.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/HallResponse",
              },
            },
          },
        },
        400: {
          description: "Invalid hall ID.",
        },
        401: {
          description: "Unauthorized.",
        },
        404: {
          description: "Hall not found.",
        },
        500: {
          description: "Internal server error.",
        },
      },
    },
  },
};

export default hallPaths;
