import { describe, it, expect, vi, beforeEach } from "vitest";

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

const MOCK_JWT_SECRET = "test_secret_key";
process.env.JWTSECRET = MOCK_JWT_SECRET;
const TOKEN_NAME = "token";

async function POST(request) {
  try {
    await mockDatabase();

    const token = request.cookies.get(TOKEN_NAME)?.value;
    if (!token) {
      return mockNextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    const decodedToken = mockJwt.verify(token, MOCK_JWT_SECRET);
    const userId = decodedToken.id;

    const { movieId, type } = await request.json();

    if (!movieId || type !== "movie") {
      return mockNextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const updateQuery = {
      $addToSet: {
        favoriteMovies: movieId,
      },
    };

    const updatedUser = await mockUser.findByIdAndUpdate(userId, updateQuery, {
      new: true,
    });

    if (!updatedUser) {
      return mockNextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return mockNextResponse.json(
      {
        message: "Movie added to favorites",
        favorites: updatedUser.favoriteMovies,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return mockNextResponse.json(
        { message: "Invalid token" },
        { status: 401 }
      );
    }
    console.error("API Error:", error);
    return mockNextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

//Test

describe("POST /api/favorites (Add Movie)", () => {
  const MOCK_USER_ID = "user123";
  const MOCK_TOKEN = "valid-jwt-token";
  const MOCK_MOVIE_ID = "tt1234567";

  const createMockRequest = (token, body) => {
    const MockNextRequest = vi.importMock("next/server").NextRequest;
    return new MockNextRequest(token, body);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDatabase.mockResolvedValue(undefined);
    mockJwt.verify.mockReturnValue({ id: MOCK_USER_ID });
  });

  it("should successfully add a movie to favorites and return 200", async () => {
    const mockFavorites = [MOCK_MOVIE_ID, "tt0011223"];
    const mockUpdatedUser = { favoriteMovies: mockFavorites };

    mockUser.findByIdAndUpdate.mockResolvedValue(mockUpdatedUser);

    const request = createMockRequest(MOCK_TOKEN, {
      movieId: MOCK_MOVIE_ID,
      type: "movie",
    });

    const response = await POST(request);

    expect(mockDatabase).toHaveBeenCalledOnce();

    expect(mockJwt.verify).toHaveBeenCalledWith(MOCK_TOKEN, MOCK_JWT_SECRET);

    expect(mockUser.findByIdAndUpdate).toHaveBeenCalledWith(
      MOCK_USER_ID,
      { $addToSet: { favoriteMovies: MOCK_MOVIE_ID } },
      { new: true }
    );

    expect(response.options.status).toBe(200);
    expect(response.data.message).toBe("Movie added to favorites");
    expect(response.data.favorites).toEqual(mockFavorites);
  });

  it("should return 401 if the authentication token is missing", async () => {
    const request = createMockRequest(undefined, {
      movieId: MOCK_MOVIE_ID,
      type: "movie",
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
      movieId: MOCK_MOVIE_ID,
      type: "movie",
    });

    const response = await POST(request);

    expect(response.options.status).toBe(401);
    expect(response.data.message).toBe("Invalid token");
  });

  it("should return 400 if movieId is missing from the payload", async () => {
    const request = createMockRequest(MOCK_TOKEN, {
      type: "movie",
    });

    const response = await POST(request);

    expect(mockUser.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(response.options.status).toBe(400);
    expect(response.data.error).toBe("Invalid request payload");
  });

  it('should return 400 if type is not "movie"', async () => {
    const request = createMockRequest(MOCK_TOKEN, {
      movieId: MOCK_MOVIE_ID,
      type: "series",
    });

    const response = await POST(request);

    expect(mockUser.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(response.options.status).toBe(400);
    expect(response.data.error).toBe("Invalid request payload");
  });

  it("should return 404 if the user is not found after token verification", async () => {
    mockUser.findByIdAndUpdate.mockResolvedValue(null);

    const request = createMockRequest(MOCK_TOKEN, {
      movieId: MOCK_MOVIE_ID,
      type: "movie",
    });

    const response = await POST(request);

    expect(mockUser.findByIdAndUpdate).toHaveBeenCalledOnce();
    expect(response.options.status).toBe(404);
    expect(response.data.error).toBe("User not found");
  });

  it("should return 500 for an unexpected error during the process (not JWT error)", async () => {
    mockDatabase.mockRejectedValue(new Error("MongoDB connection failed"));

    const request = createMockRequest(MOCK_TOKEN, {
      movieId: MOCK_MOVIE_ID,
      type: "movie",
    });

    const response = await POST(request);

    expect(response.options.status).toBe(500);
    expect(response.data.error).toBe("Internal Server Error");
  });
});
