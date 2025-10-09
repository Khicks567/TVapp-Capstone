import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import JWT from "jsonwebtoken";

const mockNextResponse = {
  json: vi.fn((data, options) => ({ data, options, json: true })),
};

vi.mock("next/server", () => ({
  NextResponse: mockNextResponse,
  NextRequest: class MockNextRequest {},
}));

const mockCookieGet = vi.fn();
const mockCookies = vi.fn(() => ({
  get: mockCookieGet,
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

const mockJwt = {
  verify: vi.fn(),
};
vi.mock("jsonwebtoken", () => ({
  default: mockJwt,
}));

const AUTH_COOKIE_NAME = "token";
const MOCK_JWT_SECRET = "test_secret_key";
process.env.JWTSECRET = MOCK_JWT_SECRET;

const MOCK_DECODED_PAYLOAD = {
  id: "user-id-123",
  username: "testuser",
  email: "test@example.com",
};

const verifyToken = (token) => {
  try {
    const secret = process.env.JWTSECRET;

    if (!secret) {
      console.error("TOKEN_SECRET not configured!");
      return null;
    }

    const decoded = JWT.verify(token, secret);
    return decoded;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
};

async function GET() {
  const cookieStore = mockCookies();

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

describe("GET /api/user/checktoken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 200 and user data if the token is valid", async () => {
    mockCookieGet.mockReturnValue({ value: "valid-token" });
    mockJwt.verify.mockReturnValue(MOCK_DECODED_PAYLOAD);

    const request = new NextRequest("http://localhost");
    const response = await GET(request);

    expect(mockCookies).toHaveBeenCalledTimes(1);
    expect(mockCookieGet).toHaveBeenCalledWith(AUTH_COOKIE_NAME);
    expect(mockJwt.verify).toHaveBeenCalledWith("valid-token", MOCK_JWT_SECRET);

    expect(response.options.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.user).toEqual(MOCK_DECODED_PAYLOAD);
  });

  it("should return 401 if no token is provided in cookies", async () => {
    mockCookieGet.mockReturnValue(undefined);

    const request = new NextRequest("http://localhost");
    const response = await GET(request);

    expect(mockCookies).toHaveBeenCalledTimes(1);
    expect(mockCookieGet).toHaveBeenCalledWith(AUTH_COOKIE_NAME);
    expect(mockJwt.verify).not.toHaveBeenCalled();

    expect(response.options.status).toBe(401);
    expect(response.data.success).toBe(false);
    expect(response.data.message).toBe("Unauthorized: No token provided.");
  });

  it("should return 401 if the token is invalid or expired", async () => {
    mockCookieGet.mockReturnValue({ value: "invalid-token" });
    mockJwt.verify.mockImplementation(() => {
      throw new Error("jwt expired");
    });

    const request = new NextRequest("http://localhost");
    const response = await GET(request);

    expect(mockCookies).toHaveBeenCalledTimes(1);
    expect(mockCookieGet).toHaveBeenCalledWith(AUTH_COOKIE_NAME);
    expect(mockJwt.verify).toHaveBeenCalledWith(
      "invalid-token",
      MOCK_JWT_SECRET
    );

    expect(response.options.status).toBe(401);
    expect(response.data.success).toBe(false);
    expect(response.data.message).toBe(
      "Unauthorized: Invalid or expired token."
    );
  });
});
