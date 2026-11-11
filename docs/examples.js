
export const examples = {
  // ==========================================
  // AUTHENTICATION EXAMPLES
  // ==========================================

  RegisterRequest: {
    value: {
      name: "Asif Jamal",
      email: "asif@example.com",
      password: "Password@123",
    },
  },

  LoginRequest: {
    value: {
      email: "asif@example.com",
      password: "Password@123",
    },
  },

  ForgotPasswordRequest: {
    value: {
      email: "asif@example.com",
    },
  },

  ResetPasswordRequest: {
    value: {
      password: "NewPassword@123",
    },
  },

  AuthSuccessResponse: {
    value: {
      success: true,
      message: "Login successful.",
      data: {
        user: {
          id: "6872bcd90123456789abcd12",
          name: "Asif Jamal",
          email: "asif@example.com",
          role: "user",
        },
        accessToken: "your_access_token",
      },
    },
  },

  RefreshTokenResponse: {
    value: {
      success: true,
      message: "Access token refreshed successfully.",
      data: {
        accessToken: "new_access_token",
      },
    },
  },

  ForgotPasswordResponse: {
    value: {
      success: true,
      message:
        "If an account exists with this email, a password reset link will be sent.",
      data: null,
    },
  },

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
