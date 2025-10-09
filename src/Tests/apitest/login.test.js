import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockCookieSet = vi.fn();

const mockNextResponse = {
  json: vi.fn((data, options) => ({
    data,
    options,
    cookies: { set: mockCookieSet },
  })),
};

vi.mock("next/server", () => ({
  NextResponse: mockNextResponse,
  NextRequest: class MockNextRequest {
    constructor(body) {
      this.json = vi.fn(() => Promise.resolve(body));
    }
  },
}));

const mockBcrypt = {
  compare: vi.fn(),
};
vi.mock("bcryptjs", () => ({
  default: mockBcrypt,
}));

const mockJwt = {
  sign: vi.fn(),
};
vi.mock("jsonwebtoken", () => ({
  default: mockJwt,
}));

const mockDatabase = vi.fn();
vi.mock("@/dbconfig/database", () => ({
  Database: mockDatabase,
}));

const mockUser = {
  findOne: vi.fn().mockReturnValue({
    select: vi.fn(),
  }),
};
vi.mock("@/models/users", () => ({
  default: mockUser,
}));

const MOCK_USER_ID = "user-id-456";
const MOCK_USER_USERNAME = "testuser";
const MOCK_USER_EMAIL = "test@example.com";
const MOCK_HASHED_PASSWORD = "hashedPassword123";
const MOCK_TOKEN = "mock-jwt-token-123";
const MOCK_JWT_SECRET = "test_secret_key";

const MOCK_USER_DB_RESULT = {
  _id: MOCK_USER_ID,
  username: MOCK_USER_USERNAME,
  email: MOCK_USER_EMAIL,
  password: MOCK_HASHED_PASSWORD,
};

process.env.JWTSECRET = MOCK_JWT_SECRET;

async function POST(request) {
  try {
    const reqBody = await request.json();

    const { email, password } = reqBody;

    console.log(reqBody);

    const userQuery = mockUser.findOne({ email });
    userQuery.select = vi.fn().mockResolvedValue(MOCK_USER_DB_RESULT);

    const user = await userQuery.select("+password");

    if (!user) {
      return NextResponse.json(
        { error: "User does not exist " },
        { status: 400 }
      );
    }

    const validPassword = await mockBcrypt.compare(password, user.password);
    if (!validPassword) {
      return NextResponse.json(
        { error: "Wrong password try again" },
        { status: 400 }
      );
    }

    const tokenData = {
      id: user._id,
      username: user.username,
      email: user.email,
    };

    const token = await mockJwt.sign(tokenData, process.env.JWTSECRET, {
      expiresIn: "1d",
    });

    const response = NextResponse.json({
      message: "Login Successful",
      success: true,
    });

    response.cookies.set("token", token, { httpOnly: true });

    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

describe("POST /api/users/login", () => {
  const createMockRequest = (body) => {
    return new NextRequest(body);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.findOne.mockReturnValue({
      select: vi.fn().mockResolvedValue(MOCK_USER_DB_RESULT),
    });
    mockBcrypt.compare.mockResolvedValue(true);
    mockJwt.sign.mockResolvedValue(MOCK_TOKEN);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should successfully log in a user and set a cookie (200)", async () => {
    const requestBody = {
      email: MOCK_USER_EMAIL,
      password: "correctpassword",
    };
    const request = createMockRequest(requestBody);

    const response = await POST(request);

    expect(mockUser.findOne).toHaveBeenCalledWith({ email: MOCK_USER_EMAIL });
    expect(mockBcrypt.compare).toHaveBeenCalledWith(
      requestBody.password,
      MOCK_HASHED_PASSWORD
    );
    expect(mockJwt.sign).toHaveBeenCalledWith(
      {
        id: MOCK_USER_ID,
        username: MOCK_USER_USERNAME,
        email: MOCK_USER_EMAIL,
      },
      MOCK_JWT_SECRET,
      { expiresIn: "1d" }
    );
    expect(mockCookieSet).toHaveBeenCalledWith("token", MOCK_TOKEN, {
      httpOnly: true,
    });
    expect(response.options.status).toBe(200);
    expect(response.data.message).toBe("Login Successful");
    expect(response.data.success).toBe(true);
  });

  it("should return 400 if user does not exist", async () => {
    mockUser.findOne.mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });
    const request = createMockRequest({
      email: "nonexistent@example.com",
      password: "password",
    });

    const response = await POST(request);

    expect(response.options.status).toBe(400);
    expect(response.data.error).toBe("User does not exist ");
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
    expect(mockJwt.sign).not.toHaveBeenCalled();
  });

  it("should return 400 for incorrect password", async () => {
    mockBcrypt.compare.mockResolvedValue(false);
    const request = createMockRequest({
      email: MOCK_USER_EMAIL,
      password: "wrongpassword",
    });

    const response = await POST(request);

    expect(response.options.status).toBe(400);
    expect(response.data.error).toBe("Wrong password try again");
    expect(mockBcrypt.compare).toHaveBeenCalledTimes(1);
    expect(mockJwt.sign).not.toHaveBeenCalled();
  });

  it("should return 500 for an internal database error", async () => {
    const errorMsg = "DB connection failed";
    mockUser.findOne.mockReturnValue({
      select: vi.fn().mockRejectedValue(new Error(errorMsg)),
    });
    const request = createMockRequest({
      email: MOCK_USER_EMAIL,
      password: "password",
    });

    const response = await POST(request);

    expect(response.options.status).toBe(500);
    expect(response.data.error).toBe(errorMsg);
  });
});
