
import { examples } from "./examples.js";

const authPaths = {
  // ==========================================
  // 1. ONE-TIME ADMIN SETUP
  // POST /api/auth/setup
  // ==========================================

  "/auth/setup": {
    post: {
      tags: ["Authentication"],
      summary: "Create the initial admin account",
      description:
        "Creates the single admin account for Live Agenda. This endpoint is intended for one-time setup through Postman or another API client. It requires the x-admin-setup-key header. Once the admin account has been created, further setup attempts are rejected. This endpoint does not log in the admin.",

      parameters: [
        {
          in: "header",
          name: "x-admin-setup-key",
          required: true,
          schema: {
            type: "string",
          },
          description:
            "The initial admin setup secret configured in the backend ADMIN_SETUP_KEY environment variable.",
        },
      ],

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
                  minLength: 2,
                  maxLength: 100,
                  example: "Asif Jamal",
                },
                email: {
                  type: "string",
                  format: "email",
                  example: "admin@example.com",
                },
                password: {
                  type: "string",
                  minLength: 8,
                  maxLength: 128,
                  example: "YourStrongPassword123",
                },
              },
            },
            example: examples.SetupAdminRequest.value,
          },
        },
      },

      responses: {
        201: {
          description:
            "Initial admin account created successfully.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AdminSetupResponse",
              },
            },
          },
        },

        400: {
          description: "Invalid or missing input data.",
        },

        403: {
          description: "Invalid admin setup key.",
        },

        409: {
          description:
            "Admin account has already been initialized.",
        },

        429: {
          description: "Too many setup attempts.",
        },

        503: {
          description: "Admin setup is not configured.",
        },
      },
    },
  },

  // ==========================================
  // 2. ADMIN LOGIN
  // POST /api/auth/login
  // ==========================================

  "/auth/login": {
    post: {
      tags: ["Authentication"],
      summary: "Admin login",
      description:
        "Authenticates the existing Live Agenda admin using email and password. Returns an access token and sets the refresh token in an HTTP-only cookie. There is no public registration endpoint.",

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
                  example: "admin@example.com",
                },
                password: {
                  type: "string",
                  example: "YourStrongPassword123",
                },
              },
            },
            example: examples.LoginRequest.value,
          },
        },
      },

      responses: {
        200: {
          description: "Admin login successful.",
          headers: {
            "Set-Cookie": {
              description:
                "HTTP-only refreshToken cookie.",
              schema: {
                type: "string",
              },
            },
          },
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AuthResponse",
              },
              example: examples.AuthResponse.value,
            },
          },
        },

        400: {
          description: "Email or password is missing or invalid.",
        },

        401: {
          description: "Invalid email or password.",
        },

        429: {
          description: "Too many login attempts.",
        },
      },
    },
  },

  // ==========================================
  // 3. REFRESH ACCESS TOKEN
  // POST /api/auth/refresh-token
  // ==========================================

  "/auth/refresh-token": {
    post: {
      tags: ["Authentication"],
      summary: "Refresh admin access token",
      description:
        "Uses the HTTP-only refresh token cookie to issue a new access token. The refresh token is rotated, and the new refresh token is stored in the HTTP-only cookie.",

      responses: {
        200: {
          description:
            "Access token refreshed successfully.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RefreshTokenResponse",
              },
              example: examples.RefreshTokenResponse.value,
            },
          },
        },

        401: {
          description:
            "Refresh token is missing, invalid, expired, or revoked.",
        },

        429: {
          description: "Too many refresh attempts.",
        },
      },
    },
  },

  // ==========================================
  // 4. ADMIN LOGOUT
  // POST /api/auth/logout
  // ==========================================

  "/auth/logout": {
    post: {
      tags: ["Authentication"],
      summary: "Admin logout",
      description:
        "Invalidates the current refresh token when valid and clears the HTTP-only refresh token cookie.",

      responses: {
        200: {
          description: "Admin logout successful.",
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
  // 5. GET ADMIN PROFILE
  // GET /api/auth/me
  // ==========================================

  "/auth/me": {
    get: {
      tags: ["Authentication"],
      summary: "Get logged-in admin profile",
      description:
        "Returns the profile of the currently authenticated Live Agenda admin.",

      security: [
        {
          bearerAuth: [],
        },
      ],

      responses: {
        200: {
          description:
            "Admin profile fetched successfully.",
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
                    example:
                      "Admin profile fetched successfully.",
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
            },
          },
        },

        401: {
          description:
            "Authentication required or access token is invalid or expired.",
        },
      },
    },
  },

  // ==========================================
  // 6. FORGOT ADMIN PASSWORD
  // POST /api/auth/forgot-password
  // ==========================================

  "/auth/forgot-password": {
    post: {
      tags: ["Authentication"],
      summary: "Forgot admin password",
      description:
        "Sends a password reset email if an admin account exists with the provided email address. The reset link expires after 15 minutes. The response does not reveal whether the email belongs to the admin.",

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
                  example: "admin@example.com",
                },
              },
            },
            example: examples.ForgotPasswordRequest.value,
          },
        },
      },

      responses: {
        200: {
          description:
            "Password reset request processed.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/MessageResponse",
              },
              example: examples.ForgotPasswordResponse.value,
            },
          },
        },

        400: {
          description: "Email is missing or invalid.",
        },

        429: {
          description:
            "Too many password reset attempts.",
        },
      },
    },
  },

  // ==========================================
  // 7. RESET ADMIN PASSWORD
  // POST /api/auth/reset-password/{token}
  // ==========================================

  "/auth/reset-password/{token}": {
    post: {
      tags: ["Authentication"],
      summary: "Reset admin password",
      description:
        "Resets the admin password using a valid, unexpired password reset token received by email. Existing refresh tokens are revoked after a successful password reset.",

      parameters: [
        {
          in: "path",
          name: "token",
          required: true,
          schema: {
            type: "string",
          },
          description:
            "Password reset token received through email.",
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
                  maxLength: 128,
                  example: "NewStrongPassword123",
                },
              },
            },
            example: examples.ResetPasswordRequest.value,
          },
        },
      },

      responses: {
        200: {
          description:
            "Admin password reset successfully.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/MessageResponse",
              },
            },
          },
        },

        400: {
          description:
            "Invalid or expired reset token, or invalid password.",
        },

        429: {
          description:
            "Too many password reset attempts.",
        },
      },
    },
  },
};

export default authPaths;
