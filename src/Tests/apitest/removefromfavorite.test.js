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

const mockGetUserIdFromToken = vi.fn();
vi.mock("@/helpers/getuserdata", () => ({
  default: mockGetUserIdFromToken,
}));

const mockUser = {
  findByIdAndUpdate: vi.fn(),
};
vi.mock("@/models/users", () => ({
  default: mockUser,
}));

const mockDatabase = vi.fn();
vi.mock("@/dbconfig/database", () => ({
  Database: mockDatabase,
}));

const MOCK_USER_ID = "user-abc-789";
const MOCK_MEDIA_ID = "54321";

const MOCK_UPDATED_USER_MOVIE = {
  _id: MOCK_USER_ID,
  favoriteMovies: ["67890"],
  favoriteTvShows: [],
};
const MOCK_UPDATED_USER_TV = {
  _id: MOCK_USER_ID,
  favoriteMovies: [],
  favoriteTvShows: ["67890"],
};

async function POST(request) {
  try {
    const reqBody = await request.json();
    const { mediaId, mediaType } = reqBody;

    const userId = mockGetUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const updateField =
      mediaType === "movie" ? "favoriteMovies" : "favoriteTvShows";

    const updatedUser = await mockUser.findByIdAndUpdate(
      userId,
      {
        $pull: { [updateField]: mediaId },
      },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: `${mediaType} removed successfully`,
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

describe("POST /api/favorites/remove", () => {
  const createMockRequest = (body) => {
    return new NextRequest(body);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserIdFromToken.mockReturnValue(MOCK_USER_ID);

    mockUser.findByIdAndUpdate.mockResolvedValue(MOCK_UPDATED_USER_MOVIE);
  });

  it("should successfully remove a movie and return 200", async () => {
    const requestBody = { mediaId: MOCK_MEDIA_ID, mediaType: "movie" };
    const request = createMockRequest(requestBody);

    const response = await POST(request);

    expect(mockGetUserIdFromToken).toHaveBeenCalledTimes(1);
    expect(mockUser.findByIdAndUpdate).toHaveBeenCalledWith(
      MOCK_USER_ID,
      { $pull: { favoriteMovies: MOCK_MEDIA_ID } },
      { new: true }
    );
    expect(response.options.status).toBe(200);
    expect(response.data.message).toBe("movie removed successfully");
    expect(response.data.success).toBe(true);
    expect(response.data.data).toEqual(MOCK_UPDATED_USER_MOVIE);
  });

  it("should successfully remove a tvshow and return 200", async () => {
    mockUser.findByIdAndUpdate.mockResolvedValue(MOCK_UPDATED_USER_TV);
    const requestBody = { mediaId: MOCK_MEDIA_ID, mediaType: "tvshow" };
    const request = createMockRequest(requestBody);

    const response = await POST(request);

    expect(mockUser.findByIdAndUpdate).toHaveBeenCalledWith(
      MOCK_USER_ID,
      { $pull: { favoriteTvShows: MOCK_MEDIA_ID } },
      { new: true }
    );
    expect(response.options.status).toBe(200);
    expect(response.data.message).toBe("tvshow removed successfully");
    expect(response.data.data).toEqual(MOCK_UPDATED_USER_TV);
  });

  it("should return 401 if authentication fails", async () => {
    mockGetUserIdFromToken.mockReturnValue(null);
    const requestBody = { mediaId: MOCK_MEDIA_ID, mediaType: "movie" };
    const request = createMockRequest(requestBody);

    const response = await POST(request);

    expect(response.options.status).toBe(401);
    expect(response.data.message).toBe("Authentication required");
    expect(mockUser.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should return 404 if user not found during update", async () => {
    mockUser.findByIdAndUpdate.mockResolvedValue(null);
    const requestBody = { mediaId: MOCK_MEDIA_ID, mediaType: "movie" };
    const request = createMockRequest(requestBody);

    const response = await POST(request);

    expect(response.options.status).toBe(404);
    expect(response.data.error).toBe("User not found");
  });

  it("should return 500 for a database or general server error", async () => {
    const errorMsg = "E11000 duplicate key error collection";
    mockUser.findByIdAndUpdate.mockRejectedValue(new Error(errorMsg));
    const requestBody = { mediaId: MOCK_MEDIA_ID, mediaType: "movie" };
    const request = createMockRequest(requestBody);

    const response = await POST(request);

    expect(response.options.status).toBe(500);
    expect(response.data.error).toBe(errorMsg);
  });

  it('should default to favoriteTvShows if mediaType is neither "movie" nor "tvshow"', async () => {
    mockUser.findByIdAndUpdate.mockResolvedValue(MOCK_UPDATED_USER_TV);
    const requestBody = { mediaId: MOCK_MEDIA_ID, mediaType: "unknown" };
    const request = createMockRequest(requestBody);

    await POST(request);

    expect(mockUser.findByIdAndUpdate).toHaveBeenCalledWith(
      MOCK_USER_ID,
      { $pull: { favoriteTvShows: MOCK_MEDIA_ID } },
      { new: true }
    );
  });
});
