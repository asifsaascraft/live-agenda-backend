
const facultyPaths = {
  // ==========================================
  // CREATE FACULTY
  // POST /api/faculties
  // ==========================================

  "/faculties": {
    post: {
      tags: ["Admin - Faculties"],
      summary: "Create a new faculty",
      description: "Creates a new faculty. Requires Admin authentication.",
      security: [{ bearerAuth: [] }],

      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["fullName", "email", "mobile"],
              properties: {
                fullName: {
                  type: "string",
                  minLength: 2,
                  maxLength: 100,
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
              },
            },
            example: {
              fullName: "Dr. Asif Jamal",
              email: "asif@example.com",
              mobile: "9876543210",
            },
          },
        },
      },

      responses: {
        201: {
          description: "Faculty created successfully.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Faculty created successfully.",
                  },
                  data: {
                    type: "object",
                    properties: {
                      faculty: {
                        $ref: "#/components/schemas/Faculty",
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
          description: "Unauthorized. Admin authentication required.",
        },
        409: {
          description: "Email or mobile number already exists.",
        },
        500: {
          description: "Internal server error.",
        },
      },
    },

    // ==========================================
    // GET ALL FACULTIES WITH PAGINATION
    // ==========================================

    get: {
      tags: ["Admin - Faculties"],
      summary: "Get all faculties with pagination",
      description:
        "Returns all faculties with pagination, searching, and sorting.",

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
          description: "Number of faculties per page. Maximum 100.",
        },
        {
          name: "search",
          in: "query",
          schema: {
            type: "string",
          },
          description:
            "Search faculties by full name, email, or mobile number.",
          example: "asif",
        },
        {
          name: "sortBy",
          in: "query",
          schema: {
            type: "string",
            enum: [
              "fullName",
              "email",
              "mobile",
              "createdAt",
              "updatedAt",
            ],
            default: "createdAt",
          },
          description: "Field used to sort faculties.",
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
          description: "Faculties fetched successfully.",
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
                    example: "Faculties fetched successfully.",
                  },
                  data: {
                    type: "object",
                    properties: {
                      faculties: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/Faculty",
                        },
                      },
                    },
                  },
                  pagination: {
                    type: "object",
                    properties: {
                      page: { type: "integer", example: 1 },
                      limit: { type: "integer", example: 20 },
                      total: { type: "integer", example: 50 },
                      totalPages: { type: "integer", example: 3 },
                      from: { type: "integer", example: 1 },
                      to: { type: "integer", example: 20 },
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
  // GET ALL FACULTIES WITHOUT PAGINATION
  // GET /api/faculties/all
  // ==========================================

  "/faculties/all": {
    get: {
      tags: ["Admin - Faculties"],
      summary: "Get all faculties without pagination",
      description:
        "Returns all faculties without pagination, with optional searching and sorting.",

      security: [{ bearerAuth: [] }],

      parameters: [
        {
          name: "search",
          in: "query",
          schema: {
            type: "string",
          },
          description:
            "Search faculties by full name, email, or mobile number.",
          example: "asif",
        },
        {
          name: "sortBy",
          in: "query",
          schema: {
            type: "string",
            enum: [
              "fullName",
              "email",
              "mobile",
              "createdAt",
              "updatedAt",
            ],
            default: "fullName",
          },
          description: "Field used to sort faculties.",
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
          description: "Faculties fetched successfully.",
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
                    example: "Faculties fetched successfully.",
                  },
                  data: {
                    type: "object",
                    properties: {
                      faculties: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/Faculty",
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
  // GET, UPDATE AND DELETE FACULTY BY ID
  // ==========================================

  "/faculties/{id}": {
    // ==========================================
    // GET FACULTY BY ID
    // ==========================================

    get: {
      tags: ["Admin - Faculties"],
      summary: "Get faculty by ID",
      description: "Fetches a single faculty using its MongoDB ID.",

      security: [{ bearerAuth: [] }],

      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "MongoDB Faculty ID.",
          example: "672b12345678901234567892",
        },
      ],

      responses: {
        200: {
          description: "Faculty fetched successfully.",
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
                    example: "Faculty fetched successfully.",
                  },
                  data: {
                    type: "object",
                    properties: {
                      faculty: {
                        $ref: "#/components/schemas/Faculty",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Invalid faculty ID.",
        },
        401: {
          description: "Unauthorized.",
        },
        404: {
          description: "Faculty not found.",
        },
        500: {
          description: "Internal server error.",
        },
      },
    },

    // ==========================================
    // UPDATE FACULTY
    // ==========================================

    put: {
      tags: ["Admin - Faculties"],
      summary: "Update faculty",
      description:
        "Updates faculty name, email, mobile, or any combination of these fields. Requires Admin authentication.",

      security: [{ bearerAuth: [] }],

      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "MongoDB Faculty ID.",
          example: "672b12345678901234567892",
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
                fullName: {
                  type: "string",
                  minLength: 2,
                  maxLength: 100,
                  example: "Dr. Updated Asif Jamal",
                },
                email: {
                  type: "string",
                  format: "email",
                  example: "updated@example.com",
                },
                mobile: {
                  type: "string",
                  example: "9876543211",
                },
              },
            },
            examples: {
              updateName: {
                summary: "Update faculty name",
                value: {
                  fullName: "Dr. Updated Asif Jamal",
                },
              },
              updateEmail: {
                summary: "Update faculty email",
                value: {
                  email: "updated@example.com",
                },
              },
              updateMobile: {
                summary: "Update faculty mobile",
                value: {
                  mobile: "9876543211",
                },
              },
              updateAll: {
                summary: "Update all faculty details",
                value: {
                  fullName: "Dr. Updated Asif Jamal",
                  email: "updated@example.com",
                  mobile: "9876543211",
                },
              },
            },
          },
        },
      },

      responses: {
        200: {
          description: "Faculty updated successfully.",
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
                    example: "Faculty updated successfully.",
                  },
                  data: {
                    type: "object",
                    properties: {
                      faculty: {
                        $ref: "#/components/schemas/Faculty",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Validation error or invalid faculty ID.",
        },
        401: {
          description: "Unauthorized.",
        },
        404: {
          description: "Faculty not found.",
        },
        409: {
          description: "Email or mobile number already exists.",
        },
        500: {
          description: "Internal server error.",
        },
      },
    },

    // ==========================================
    // DELETE FACULTY
    // ==========================================

    delete: {
      tags: ["Admin - Faculties"],
      summary: "Delete faculty",
      description:
        "Permanently deletes a faculty using its MongoDB ID.",

      security: [{ bearerAuth: [] }],

      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "MongoDB Faculty ID.",
          example: "672b12345678901234567892",
        },
      ],

      responses: {
        200: {
          description: "Faculty deleted successfully.",
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
                    example: "Faculty deleted successfully.",
                  },
                  data: {
                    type: "object",
                    properties: {
                      faculty: {
                        $ref: "#/components/schemas/Faculty",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Invalid faculty ID.",
        },
        401: {
          description: "Unauthorized.",
        },
        404: {
          description: "Faculty not found.",
        },
        500: {
          description: "Internal server error.",
        },
      },
    },
  },
};

export default facultyPaths;
