import { NextRequest } from "next/server";
import JWT from "jsonwebtoken";

interface JwtPayload {
  id: string;
}

const getUserIdFromToken = (request: NextRequest): string => {
  const token = request.cookies.get("token")?.value || "";
  const jwtSecret = process.env.JWTSECRET;

  if (!token || !jwtSecret) {
    throw new Error("Unauthorized: Missing token or secret.");
  }

  try {
    const decodedToken = JWT.verify(token, jwtSecret) as JwtPayload;
    return decodedToken.id;
  } catch (error: unknown) {
    console.log(error);
    throw new Error("Invalid or expired token.");
  }
};

export default getUserIdFromToken;
