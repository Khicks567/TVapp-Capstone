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

const MOCK_USER_ID = "user-id-987";

const MOCK_NOTIFICATIONS = [
  { id: "123", dateCreated: "2024-01-01", notificationDate: "2024-06-15" },
  { id: "456", dateCreated: "2024-02-01", notificationDate: "N/A" },
];

const MOCK_USER_DB_RESULT = {
  _id: MOCK_USER_ID,
  notifications: MOCK_NOTIFICATIONS,
};

async function GET(request) {
  try {
    const userId = mockGetUserIdFromToken(request);

    const userQuery = mockUser.findById(userId);
    userQuery.select = vi.fn().mockResolvedValue(MOCK_USER_DB_RESULT);

    const user = await userQuery.select("notifications");

    if (!user) {
      return NextResponse.json(
        {
          message: "User not found or not logged in.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: user.notifications,
      success: true,
    });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        error: "Failed to fetch notifications list.",
      },
      { status: 500 }
    );
  }
}

describe("GET /api/notifications", () => {
  const request = new NextRequest("http://localhost");

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserIdFromToken.mockReturnValue(MOCK_USER_ID);
    mockUser.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue(MOCK_USER_DB_RESULT),
    });
  });

  it("should return 200 and the user notifications data on success", async () => {
    const response = await GET(request);

    expect(mockGetUserIdFromToken).toHaveBeenCalledWith(request);
    expect(mockUser.findById).toHaveBeenCalledWith(MOCK_USER_ID);
    expect(response.options.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toEqual(MOCK_NOTIFICATIONS);
  });

  it("should return 404 if the user is not found", async () => {
    mockUser.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });
    const response = await GET(request);

    expect(response.options.status).toBe(404);
    expect(response.data.message).toBe("User not found or not logged in.");
  });

  it("should return 500 if authentication fails (error thrown by getuserdata)", async () => {
    mockGetUserIdFromToken.mockImplementation(() => {
      throw new Error("Token expired");
    });

    const response = await GET(request);

    expect(response.options.status).toBe(500);
    expect(response.data.error).toBe("Failed to fetch notifications list.");
  });

  it("should return 500 for a general database error", async () => {
    const dbError = new Error("Database connection failed");
    mockUser.findById.mockReturnValue({
      select: vi.fn().mockRejectedValue(dbError),
    });

    const response = await GET(request);

    expect(response.options.status).toBe(500);
    expect(response.data.error).toBe("Failed to fetch notifications list.");
  });
});
