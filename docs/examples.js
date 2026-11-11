
export const examples = {
  // ==========================================
  // ADMIN SETUP REQUEST
  // ==========================================

  SetupAdminRequest: {
    value: {
      name: "Asif Jamal",
      email: "admin@example.com",
      password: "YourStrongPassword123",
    },
  },

  // ==========================================
  // ADMIN SETUP RESPONSE
  // ==========================================

  AdminSetupResponse: {
    value: {
      success: true,
      message:
        "Admin account created successfully. Please login.",
      data: {
        admin: {
          id: "primary-admin",
          name: "Asif Jamal",
          email: "admin@example.com",
          createdAt: "2026-11-11T10:00:00.000Z",
        },
      },
    },
  },

  // ==========================================
  // ADMIN LOGIN REQUEST
  // ==========================================

  LoginRequest: {
    value: {
      email: "admin@example.com",
      password: "YourStrongPassword123",
    },
  },

  // ==========================================
  // ADMIN LOGIN RESPONSE
  // ==========================================

  AuthResponse: {
    value: {
      success: true,
      message: "Admin login successful.",
      data: {
        admin: {
          id: "primary-admin",
          name: "Asif Jamal",
          email: "admin@example.com",
        },
        accessToken: "your_access_token",
      },
    },
  },

  // ==========================================
  // ADMIN PROFILE RESPONSE
  // ==========================================

  AdminProfileResponse: {
    value: {
      success: true,
      message: "Admin profile fetched successfully.",
      data: {
        admin: {
          id: "primary-admin",
          name: "Asif Jamal",
          email: "admin@example.com",
          createdAt: "2026-11-11T10:00:00.000Z",
        },
      },
    },
  },

  // ==========================================
  // REFRESH TOKEN RESPONSE
  // ==========================================

  RefreshTokenResponse: {
    value: {
      success: true,
      message: "Access token refreshed successfully.",
      data: {
        accessToken: "new_access_token",
      },
    },
  },

  // ==========================================
  // FORGOT PASSWORD REQUEST
  // ==========================================

  ForgotPasswordRequest: {
    value: {
      email: "admin@example.com",
    },
  },

  // ==========================================
  // FORGOT PASSWORD RESPONSE
  // ==========================================

  ForgotPasswordResponse: {
    value: {
      success: true,
      message:
        "If an account exists with this email, a password reset link will be sent.",
      data: null,
    },
  },

  // ==========================================
  // RESET PASSWORD REQUEST
  // ==========================================

  ResetPasswordRequest: {
    value: {
      password: "NewStrongPassword123",
    },
  },

  // ==========================================
  // LOGOUT RESPONSE
  // ==========================================

  LogoutResponse: {
    value: {
      success: true,
      message: "Admin logout successful.",
      data: null,
    },
  },

  // ==========================================
  // GENERIC ERROR RESPONSE
  // ==========================================

  ErrorResponse: {
    value: {
      success: false,
      message: "Invalid email or password.",
      errors: null,
      data: null,
    },
  },
};



export default examples;
