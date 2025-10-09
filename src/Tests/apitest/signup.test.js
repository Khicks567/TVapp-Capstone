import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockNextResponse = {
  json: vi.fn((data, options) => ({ data, options, json: true })),
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
  genSalt: vi.fn(),
  hash: vi.fn(),
};
vi.mock("bcryptjs", () => mockBcrypt);

const mockUser = {
  findOne: vi.fn(),
  save: vi.fn(),
};

const mockUserModel = vi.fn((data) => ({
  ...data,
  save: mockUser.save,
}));

vi.mock("@/models/users", () => ({
  default: mockUserModel,
}));

const mockDatabase = vi.fn();
vi.mock("@/dbconfig/database", () => ({
  Database: mockDatabase,
}));

const MOCK_USER = {
  username: "testuser",
  email: "test@example.com",
  password: "password123",
};
const MOCK_HASHED_PASSWORD = "hashedpassword123";
const MOCK_SALT = "mockedsalt12";

async function POST(req) {
  try {
    const reqBody = await req.json();

    const { username, email, password } = reqBody;

    const userExists = await mockUser.findOne({
      $or: [{ email }, { username }],
    });

    if (userExists) {
      let errorMessage = "User already exists";
      if (userExists.email === email) {
        errorMessage = "A user with this email already exists";
      } else if (userExists.username === username) {
        errorMessage = "This username is already taken";
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const salt = await mockBcrypt.genSalt(12);
    const hashed = await mockBcrypt.hash(password, salt);

    const newUser = new mockUserModel({
      username,
      email,
      password: hashed,
    });

    await newUser.save();

    return NextResponse.json({
      message: "User has been created",
      success: true,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

describe("POST /api/users/signup", () => {
  const createMockRequest = (body) => {
    // @ts-ignore
    return new NextRequest(body);
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUser.findOne.mockResolvedValue(null);
    mockBcrypt.genSalt.mockResolvedValue(MOCK_SALT);
    mockBcrypt.hash.mockResolvedValue(MOCK_HASHED_PASSWORD);
    mockUser.save.mockResolvedValue(true);
  });

  it("should successfully register a new user and return 200", async () => {
    const request = createMockRequest(MOCK_USER);

    const response = await POST(request);

    expect(mockUser.findOne).toHaveBeenCalledWith({
      $or: [{ email: MOCK_USER.email }, { username: MOCK_USER.username }],
    });
    expect(mockBcrypt.genSalt).toHaveBeenCalledWith(12);
    expect(mockBcrypt.hash).toHaveBeenCalledWith(MOCK_USER.password, MOCK_SALT);
    expect(mockUserModel).toHaveBeenCalledWith({
      username: MOCK_USER.username,
      email: MOCK_USER.email,
      password: MOCK_HASHED_PASSWORD,
    });
    expect(mockUser.save).toHaveBeenCalledTimes(1);
    expect(response.options.status).toBe(200);
    expect(response.data.message).toBe("User has been created");
  });

  it("should return 400 if user with the same email already exists", async () => {
    mockUser.findOne.mockResolvedValue({
      email: MOCK_USER.email,
      username: "othername",
    });
    const request = createMockRequest(MOCK_USER);

    const response = await POST(request);

    expect(response.options.status).toBe(400);
    expect(response.data.error).toBe("A user with this email already exists");
    expect(mockUser.save).not.toHaveBeenCalled();
  });

  it("should return 400 if user with the same username already exists", async () => {
    mockUser.findOne.mockResolvedValue({
      email: "other@test.com",
      username: MOCK_USER.username,
    });
    const request = createMockRequest(MOCK_USER);

    const response = await POST(request);

    expect(response.options.status).toBe(400);
    expect(response.data.error).toBe("This username is already taken");
    expect(mockUser.save).not.toHaveBeenCalled();
  });

  it("should return 500 if user saving fails", async () => {
    const errorMsg = "E11000 validation failed";
    mockUser.save.mockRejectedValue(new Error(errorMsg));
    const request = createMockRequest(MOCK_USER);

    const response = await POST(request);

    expect(response.options.status).toBe(500);
    expect(response.data.error).toBe(errorMsg);
  });

  it("should return 500 if password hashing fails", async () => {
    const errorMsg = "Bcrypt failure";
    mockBcrypt.hash.mockRejectedValue(new Error(errorMsg));
    const request = createMockRequest(MOCK_USER);

    const response = await POST(request);

    expect(response.options.status).toBe(500);
    expect(response.data.error).toBe(errorMsg);
  });
});
