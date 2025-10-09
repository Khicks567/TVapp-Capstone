import { NextRequest, NextResponse } from "next/server";
import JWT from "jsonwebtoken";

const getUserIdFromToken = (request: NextRequest) => {
  const token = request.cookies.get("token")?.value || "";

  if (!token || !process.env.JWTSECRET) {
    throw new Error("Unauthorized");
  }

  try {
    const decodedToken: any = JWT.verify(token, process.env.JWTSECRET!);
    return decodedToken.id;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};

export default getUserIdFromToken;
