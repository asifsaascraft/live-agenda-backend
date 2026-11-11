
import { examples } from "./examples.js";

const authPaths = {
  // ==========================================
  // REGISTER
  // ==========================================

  "/auth/register": {
    post: {
      tags: ["Authentication"],
      summary: "Register a new user",
      description:
        "Creates a new user account and automatically logs in the user. The refresh token is set as an HTTP-only cookie.",

      requestBody: {
        required: true,

        content: {
          "application/json": {
            schema: {
              type: "object",

              required: ["name", "email", "password"],

              properties: {
                name: {
                  type: "string",
                  example: "Asif Jamal",
                },

                email: {
                  type: "string",
                  format: "email",
                  example: "asif@example.com",
                },

                password: {
                  type: "string",
                  minLength: 8,
                  example: "Password@123",
                },
              },
            },

            example: examples.RegisterRequest.value,
          },
        },
      },

      responses: {
        201: {
          description: "User registered successfully.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AuthResponse",
              },
            },
          },
        },

        400: {
          description: "Invalid input.",
        },

        409: {
          description: "Email already exists.",
        },
      },
    },
  },

  // ==========================================
  // LOGIN
  // ==========================================

  "/auth/login": {
    post: {
      tags: ["Authentication"],
      summary: "Login user",
      description:
        "Authenticates the user and returns an access token. Refresh token is stored in an HTTP-only cookie.",

      requestBody: {
        required: true,

        content: {
          "application/json": {
            schema: {
              type: "object",

              required: ["email", "password"],

              properties: {
                email: {
                  type: "string",
                  format: "email",
                  example: "asif@example.com",
                },

                password: {
                  type: "string",
                  example: "Password@123",
                },
              },
            },

            example: examples.LoginRequest.value,
          },
        },
      },

      responses: {
        200: {
          description: "Login successful.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AuthResponse",
              },
            },
          },
        },

        400: {
          description: "Missing email or password.",
        },

        401: {
          description: "Invalid credentials.",
        },
      },
    },
  },

  // ==========================================
  // REFRESH TOKEN
  // ==========================================

  "/auth/refresh-token": {
    post: {
      tags: ["Authentication"],
      summary: "Refresh access token",
      description:
        "Uses the HTTP-only refresh token cookie to issue a new access token and rotate the refresh token.",

      responses: {
        200: {
          description: "Access token refreshed successfully.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RefreshTokenResponse",
              },
            },
          },
        },

        401: {
          description: "Invalid or expired refresh token.",
        },
      },
    },
  },

  // ==========================================
  // LOGOUT
  // ==========================================

  "/auth/logout": {
    post: {
      tags: ["Authentication"],
      summary: "Logout user",
      description:
        "Invalidates the refresh token and clears the HTTP-only refresh token cookie.",

      responses: {
        200: {
          description: "Logout successful.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/MessageResponse",
              },
            },
          },
        },
      },
    },
  },

  // ==========================================
  // GET PROFILE
  // ==========================================

  "/auth/me": {
    get: {
      tags: ["Authentication"],
      summary: "Get logged-in user profile",
      description:
        "Returns the currently authenticated user's profile.",

      security: [
        {
          bearerAuth: [],
        },
      ],

      responses: {
        200: {
          description: "User profile fetched successfully.",

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
                    example: "User profile fetched successfully.",
                  },

                  data: {
                    type: "object",

                    properties: {
                      user: {
                        $ref: "#/components/schemas/User",
                      },
                    },
                  },
                },
              },
            },
          },
        },

        401: {
          description: "Authentication required.",
        },
      },
    },
  },

  // ==========================================
  // FORGOT PASSWORD
  // ==========================================

  "/auth/forgot-password": {
    post: {
      tags: ["Authentication"],
      summary: "Forgot password",
      description:
        "Sends a password reset email if an account exists with the provided email address. Reset links expire after 15 minutes.",

      requestBody: {
        required: true,

        content: {
          "application/json": {
            schema: {
              type: "object",

              required: ["email"],

              properties: {
                email: {
                  type: "string",
                  format: "email",
                  example: "asif@example.com",
                },
              },
            },

            example: examples.ForgotPasswordRequest.value,
          },
        },
      },

      responses: {
        200: {
          description: "Password reset request processed.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/MessageResponse",
              },
            },
          },
        },

        400: {
          description: "Email is required.",
        },
      },
    },
  },

  // ==========================================
  // RESET PASSWORD
  // ==========================================

  "/auth/reset-password/{token}": {
    post: {
      tags: ["Authentication"],
      summary: "Reset password",
      description:
        "Resets the user's password using a valid, unexpired reset token.",

      parameters: [
        {
          in: "path",
          name: "token",
          required: true,

          schema: {
            type: "string",
          },

          description: "Password reset token received through email.",
        },
      ],

      requestBody: {
        required: true,

        content: {
          "application/json": {
            schema: {
              type: "object",

              required: ["password"],

              properties: {
                password: {
                  type: "string",
                  minLength: 8,
                  example: "NewPassword@123",
                },
              },
            },

            example: examples.ResetPasswordRequest.value,
          },
        },
      },

      responses: {
        200: {
          description: "Password reset successful.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/MessageResponse",
              },
            },
          },
        },

        400: {
          description: "Invalid or expired reset token.",
        },
      },
    },
  },
};

export default authPaths;
