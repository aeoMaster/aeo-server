import jwt from "jsonwebtoken";

interface InvitationPayload {
  email: string;
  companyId: string;
  role: string;
}

export const generateInvitationToken = (
  email: string,
  companyId: string,
  role: string
): string => {
  const payload: InvitationPayload = {
    email,
    companyId,
    role,
  };

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: "7d", // Token expires in 7 days
  });
};

export const verifyInvitationToken = (token: string): InvitationPayload => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as InvitationPayload;
  } catch (error) {
    throw new Error("Invalid or expired invitation token");
  }
};
