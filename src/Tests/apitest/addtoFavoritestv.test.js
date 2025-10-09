import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockNextResponse = {
  json: vi.fn((data, options) => ({ data, options, json: true })),
};

vi.mock("next/server", () => ({
  NextResponse: mockNextResponse,
  NextRequest: class MockNextRequest {
    constructor(cookies, body) {
      this.cookies = {
        get: vi.fn((name) =>
          name === "token" ? { value: cookies } : undefined
        ),
      };
      this.json = vi.fn(() => Promise.resolve(body));
    }
  },
}));

const mockDatabase = vi.fn();
vi.mock("@/dbconfig/database", () => ({
  Database: mockDatabase,
}));

const mockUser = {
  findByIdAndUpdate: vi.fn(),
};
vi.mock("@/models/users", () => ({
  default: mockUser,
}));

const mockJwt = {
  verify: vi.fn(),
};
vi.mock("jsonwebtoken", () => ({
  default: mockJwt,
}));

const TOKEN_NAME = "token";
const MOCK_JWT_SECRET = "test_secret_key";
process.env.JWTSECRET = MOCK_JWT_SECRET;

const MOCK_USER_ID = "user-abc-123";
const MOCK_SHOW_ID = "78901";
const MOCK_TOKEN = "valid-jwt-token";

async function POST(request) {
  try {
    await mockDatabase();

    const token = request.cookies.get(TOKEN_NAME)?.value;
    if (!token) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    const decodedToken = mockJwt.verify(token, MOCK_JWT_SECRET);
    const userId = decodedToken.id;

    const { showId, type } = await request.json();

    if (!showId || type !== "tvshow") {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const updateQuery = {
      $addToSet: {
        favoriteTvShows: showId,
      },
    };

    const updatedUser = await mockUser.findByIdAndUpdate(userId, updateQuery, {
      new: true,
    });

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "TV Show added to favorites",
        favorites: updatedUser.favoriteTvShows,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

describe("POST /api/favorites (Add TV Show)", () => {
  const createMockRequest = (token, body) => {
    return new NextRequest(token, body);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDatabase.mockResolvedValue(undefined);
    mockJwt.verify.mockReturnValue({ id: MOCK_USER_ID });
  });

  it("should successfully add a TV Show to favorites and return 200", async () => {
    const mockFavorites = [MOCK_SHOW_ID, "other-show"];
    const mockUpdatedUser = { favoriteTvShows: mockFavorites };

    mockUser.findByIdAndUpdate.mockResolvedValue(mockUpdatedUser);

    const request = createMockRequest(MOCK_TOKEN, {
      showId: MOCK_SHOW_ID,
      type: "tvshow",
    });

    const response = await POST(request);

    expect(mockJwt.verify).toHaveBeenCalledWith(MOCK_TOKEN, MOCK_JWT_SECRET);

    expect(mockUser.findByIdAndUpdate).toHaveBeenCalledWith(
      MOCK_USER_ID,
      { $addToSet: { favoriteTvShows: MOCK_SHOW_ID } },
      { new: true }
    );

    expect(response.options.status).toBe(200);
    expect(response.data.message).toBe("TV Show added to favorites");
    expect(response.data.favorites).toEqual(mockFavorites);
  });

  it("should return 401 if the authentication token is missing", async () => {
    const request = createMockRequest(undefined, {
      showId: MOCK_SHOW_ID,
      type: "tvshow",
    });

    const response = await POST(request);

    expect(mockJwt.verify).not.toHaveBeenCalled();
    expect(response.options.status).toBe(401);
    expect(response.data.message).toBe("Not authenticated");
  });

  it("should return 401 if the authentication token is invalid (JsonWebTokenError)", async () => {
    const error = new Error("invalid signature");
    error.name = "JsonWebTokenError";
    mockJwt.verify.mockImplementation(() => {
      throw error;
    });

    const request = createMockRequest("invalid-token", {
      showId: MOCK_SHOW_ID,
      type: "tvshow",
    });

    const response = await POST(request);

    expect(response.options.status).toBe(401);
    expect(response.data.message).toBe("Invalid token");
  });

  it("should return 400 if showId is missing from the payload", async () => {
    const request = createMockRequest(MOCK_TOKEN, {
      type: "tvshow",
    });

    const response = await POST(request);

    expect(mockUser.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(response.options.status).toBe(400);
    expect(response.data.error).toBe("Invalid request payload");
  });

  it('should return 400 if type is not "tvshow"', async () => {
    const request = createMockRequest(MOCK_TOKEN, {
      showId: MOCK_SHOW_ID,
      type: "movie",
    });

    const response = await POST(request);

    expect(mockUser.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(response.options.status).toBe(400);
    expect(response.data.error).toBe("Invalid request payload");
  });

  it("should return 404 if the user is not found during the update", async () => {
    mockUser.findByIdAndUpdate.mockResolvedValue(null);

    const request = createMockRequest(MOCK_TOKEN, {
      showId: MOCK_SHOW_ID,
      type: "tvshow",
    });

    const response = await POST(request);

    expect(mockUser.findByIdAndUpdate).toHaveBeenCalledOnce();
    expect(response.options.status).toBe(404);
    expect(response.data.error).toBe("User not found");
  });

  it("should return 500 for an unexpected database error", async () => {
    mockUser.findByIdAndUpdate.mockRejectedValue(
      new Error("MongoDB cluster unavailable")
    );

    const request = createMockRequest(MOCK_TOKEN, {
      showId: MOCK_SHOW_ID,
      type: "tvshow",
    });

    const response = await POST(request);

    expect(response.options.status).toBe(500);
    expect(response.data.error).toBe("Internal Server Error");
  });
});
