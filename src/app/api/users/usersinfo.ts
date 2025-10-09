import { NextRequest, NextResponse } from "next/server";
import JWT from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value || "";

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: No token provided" },
        { status: 401 }
      );
    }

    if (!process.env.JWTSECRET) {
      throw new Error("JWTSECRET environment variable is not set.");
    }

    const decodedToken: any = JWT.verify(token, process.env.JWTSECRET!);

    const userData = {
      id: decodedToken.id,
      username: decodedToken.username,
      email: decodedToken.email,
    };

    return NextResponse.json({
      message: "User data fetched successfully",
      success: true,
      data: userData,
    });
  } catch (error: any) {
    console.error("Failed to decode token:", error.message);

    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }
}
