import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import JWT, { JwtPayload } from "jsonwebtoken";

const AUTH_COOKIE_NAME = "token";

// Checks for token
const verifyToken = (token: string): JwtPayload | null => {
  try {
    const secret = process.env.JWTSECRET;

    if (!secret) {
      console.error("TOKEN_SECRET not configured!");
      return null;
    }

    const decoded = JWT.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
};

export async function GET() {
  const cookieStore = await cookies();

  const tokenCookie = cookieStore.get(AUTH_COOKIE_NAME);

  if (!tokenCookie) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: No token provided." },
      { status: 401 }
    );
  }

  const decodedPayload = verifyToken(tokenCookie.value);

  if (decodedPayload) {
    const { id, username, email } = decodedPayload;

    return NextResponse.json(
      {
        success: true,
        message: "Authenticated",
        user: { id, username, email },
      },
      { status: 200 }
    );
  } else {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Invalid or expired token." },
      { status: 401 }
    );
  }
}
