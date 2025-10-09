import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockNextResponse = {
  json: vi.fn((data, options) => ({ data, options, json: true })),
};

vi.mock("next/server", () => ({
  NextResponse: mockNextResponse,
  NextRequest: class MockNextRequest {},
}));

const mockGetUserIdFromToken = vi.fn();
vi.mock("@/helpers/getuserdata", () => ({
  default: mockGetUserIdFromToken,
}));

const mockUser = {
  findById: vi.fn(),
};
vi.mock("@/models/users", () => ({
  default: mockUser,
}));

const mockDatabase = vi.fn();
vi.mock("@/dbconfig/database", () => ({
  Database: mockDatabase,
}));

const MOCK_USER_ID = "user-id-789";

const MOCK_FAVORITES_DATA = {
  favoriteMovies: ["101", "102"],
  favoriteTvShows: ["201"],
};

const MOCK_USER_DB_RESULT = {
  _id: MOCK_USER_ID,
  favoriteMovies: MOCK_FAVORITES_DATA.favoriteMovies,
  favoriteTvShows: MOCK_FAVORITES_DATA.favoriteTvShows,
};

async function GET(request) {
  try {
    await mockDatabase();

    const userId = mockGetUserIdFromToken(request);

    const userQuery = mockUser.findById(userId);
    userQuery.select = vi.fn().mockResolvedValue(MOCK_USER_DB_RESULT);

    const user = await userQuery.select("favoriteMovies favoriteTvShows");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "User favorites fetched successfully",
      success: true,
      data: {
        favoriteMovies: user.favoriteMovies,
        favoriteTvShows: user.favoriteTvShows,
      },
    });
  } catch (error) {
    if (error.message.includes("token")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

describe("GET /api/favorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserIdFromToken.mockReturnValue(MOCK_USER_ID);

    mockUser.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue(MOCK_USER_DB_RESULT),
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 200 and user favorites data on success", async () => {
    const request = new NextRequest("http://localhost");
    const response = await GET(request);

    expect(mockGetUserIdFromToken).toHaveBeenCalledWith(request);
    expect(mockUser.findById).toHaveBeenCalledWith(MOCK_USER_ID);
    expect(response.options.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toEqual(MOCK_FAVORITES_DATA);
  });

  it("should return 404 if the user is not found", async () => {
    mockUser.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });
    const request = new NextRequest("http://localhost");
    const response = await GET(request);

    expect(response.options.status).toBe(404);
    expect(response.data.error).toBe("User not found");
  });

  it("should return 401 if token authentication fails", async () => {
    const tokenError = new Error("Invalid token provided");
    tokenError.message = "Authentication failed: Invalid token";

    mockGetUserIdFromToken.mockImplementation(() => {
      throw tokenError;
    });

    const request = new NextRequest("http://localhost");
    const response = await GET(request);

    expect(response.options.status).toBe(401);
    expect(response.data.error).toBe(tokenError.message);
  });

  it("should return 500 for a general database error", async () => {
    const dbError = new Error("Network timeout");
    mockUser.findById.mockReturnValue({
      select: vi.fn().mockRejectedValue(dbError),
    });

    const request = new NextRequest("http://localhost");
    const response = await GET(request);

    expect(response.options.status).toBe(500);
    expect(response.data.error).toBe("Internal Server Error");
  });
});
