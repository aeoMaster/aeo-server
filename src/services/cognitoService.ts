import {
  CognitoIdentityProviderClient,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ForgotPasswordCommandOutput,
  ConfirmForgotPasswordCommandOutput,
} from "@aws-sdk/client-cognito-identity-provider";
import { AppError } from "../middleware/errorHandler";

class CognitoService {
  private client: CognitoIdentityProviderClient;
  // private userPoolId: string; // Reserved for future use
  private clientId: string;

  constructor() {
    // this.userPoolId = process.env.AWS_COGNITO_USER_POOL_ID!; // Reserved for future use
    this.clientId = process.env.AWS_COGNITO_CLIENT_ID!;

    this.client = new CognitoIdentityProviderClient({
      region: process.env.COGNITO_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  /**
   * Initiate forgot password flow
   */
  async initiateForgotPassword(
    username: string
  ): Promise<ForgotPasswordCommandOutput> {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: this.clientId,
        Username: username,
      });

      const response = await this.client.send(command);

      console.log(`Password reset initiated for user: ${username}`);
      return response;
    } catch (error: any) {
      console.error("Forgot password error:", error);

      // Handle specific Cognito errors
      if (error.name === "UserNotFoundException") {
        // Don't reveal that user doesn't exist
        throw new AppError(
          200,
          "If an account exists with this email, a password reset code has been sent."
        );
      } else if (error.name === "LimitExceededException") {
        throw new AppError(
          429,
          "Too many password reset attempts. Please try again later."
        );
      } else if (error.name === "InvalidParameterException") {
        throw new AppError(400, "Invalid email address format.");
      }

      throw new AppError(500, "Failed to initiate password reset");
    }
  }

  /**
   * Confirm forgot password with code
   */
  async confirmForgotPassword(
    username: string,
    code: string,
    newPassword: string
  ): Promise<ConfirmForgotPasswordCommandOutput> {
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: this.clientId,
        Username: username,
        ConfirmationCode: code,
        Password: newPassword,
      });

      const response = await this.client.send(command);

      console.log(`Password reset confirmed for user: ${username}`);
      return response;
    } catch (error: any) {
      console.error("Confirm forgot password error:", error);

      // Handle specific Cognito errors
      if (error.name === "ExpiredCodeException") {
        throw new AppError(
          400,
          "The verification code has expired. Please request a new one."
        );
      } else if (error.name === "CodeMismatchException") {
        throw new AppError(400, "Invalid verification code.");
      } else if (error.name === "UserNotFoundException") {
        throw new AppError(400, "User not found.");
      } else if (error.name === "InvalidPasswordException") {
        throw new AppError(400, "Password does not meet the requirements.");
      } else if (error.name === "NotAuthorizedException") {
        throw new AppError(
          400,
          "Invalid verification code or user not authorized."
        );
      }

      throw new AppError(500, "Failed to reset password");
    }
  }

  /**
   * Validate password against Cognito policy
   */
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation - Cognito will do the final validation
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const cognitoService = new CognitoService();
