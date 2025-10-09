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
  findOneAndUpdate: vi.fn(),
};
vi.mock("@/models/users", () => ({
  default: mockUser,
}));

const MOCK_USER_ID = "user-abc-789";
const MOCK_SHOW_ID = "12345";
const MOCK_AUTH_ERROR = "Token is missing or invalid";

async function DELETE(request) {
  let userId;

  try {
    userId = mockGetUserIdFromToken(request);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  let showId;
  try {
    const body = await request.json();
    showId = body.showId;

    if (!showId) {
      return NextResponse.json(
        { error: "Missing showId in request body." },
        { status: 400 }
      );
    }
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const updatedUser = await mockUser.findOneAndUpdate(
      { _id: userId },
      {
        $pull: {
          notifications: {
            id: showId,
          },
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: `Notification for show ID ${showId} successfully removed or already nonexistent.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Database deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete notification due to a server error." },
      { status: 500 }
    );
  }
}

describe("DELETE /api/users/shownotifications", () => {
  const createMockRequest = (body) => {
    return new NextRequest(body);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserIdFromToken.mockReturnValue(MOCK_USER_ID);
  });

  it("should successfully remove a notification and return 200", async () => {
    const mockUpdatedUser = { notifications: [] };
    mockUser.findOneAndUpdate.mockResolvedValue(mockUpdatedUser);

    const request = createMockRequest({ showId: MOCK_SHOW_ID });

    const response = await DELETE(request);

    expect(mockGetUserIdFromToken).toHaveBeenCalledTimes(1);
    expect(mockUser.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: MOCK_USER_ID },
      { $pull: { notifications: { id: MOCK_SHOW_ID } } },
      { new: true }
    );

    expect(response.options.status).toBe(200);
    expect(response.data.message).toContain(
      `Notification for show ID ${MOCK_SHOW_ID} successfully removed`
    );
  });

  it("should return 401 if authentication fails (token invalid/missing)", async () => {
    mockGetUserIdFromToken.mockImplementation(() => {
      throw new Error(MOCK_AUTH_ERROR);
    });

    const request = createMockRequest({ showId: MOCK_SHOW_ID });

    const response = await DELETE(request);

    expect(response.options.status).toBe(401);
    expect(response.data.error).toBe(MOCK_AUTH_ERROR);
    expect(mockUser.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("should return 400 if showId is missing from the payload", async () => {
    const request = createMockRequest({});

    const response = await DELETE(request);

    expect(response.options.status).toBe(400);
    expect(response.data.error).toBe("Missing showId in request body.");
    expect(mockUser.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("should return 400 if the request body is invalid JSON", async () => {
    const request = createMockRequest({ showId: MOCK_SHOW_ID });
    request.json.mockRejectedValue(new Error("Syntax Error"));

    const response = await DELETE(request);

    expect(response.options.status).toBe(400);
    expect(response.data.error).toBe("Invalid JSON body.");
    expect(mockUser.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("should return 404 if the user is not found during the update", async () => {
    mockUser.findOneAndUpdate.mockResolvedValue(null);

    const request = createMockRequest({ showId: MOCK_SHOW_ID });

    const response = await DELETE(request);

    expect(response.options.status).toBe(404);
    expect(response.data.error).toBe("User not found.");
    expect(mockUser.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it("should return 500 for a database error", async () => {
    mockUser.findOneAndUpdate.mockRejectedValue(
      new Error("MongoDB connection closed")
    );

    const request = createMockRequest({ showId: MOCK_SHOW_ID });

    const response = await DELETE(request);

    expect(response.options.status).toBe(500);
    expect(response.data.error).toBe(
      "Failed to delete notification due to a server error."
    );
  });
});
