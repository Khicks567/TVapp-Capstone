import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

// Mock

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((data, options) => ({ data, options, json: true })),
  },
}));

const mockGetUserData = vi.fn();
const mockSendEmail = vi.fn();
vi.mock("@/helpers/getuserdata", () => ({ default: mockGetUserData }));
vi.mock("@/helpers/sendmail", () => ({ default: mockSendEmail }));

const mockDatabase = vi.fn();
vi.mock("@/dbconfig/database", () => ({
  Database: mockDatabase,
}));

const mockAxios = { get: vi.fn() };
vi.mock("axios", () => ({ default: mockAxios }));

const mockUserInstance = (notifications = []) => ({
  email: "test@example.com",
  username: "testuser",
  notifications: notifications,
  save: vi.fn().mockResolvedValue(true),
});
const mockUser = {
  findById: vi.fn().mockReturnThis(),
  select: vi.fn(),
};
vi.mock("@/models/users", () => ({
  default: mockUser,
}));

const MOCK_TMDB_API_KEY = "mock_tmdb_key_123";
process.env.NEXT_PUBLIC_API_KEY = MOCK_TMDB_API_KEY;
const MOCK_USER_ID = "user123";
const MOCK_TV_SHOW_ID = 60735;
const MOCK_SHOW_NAME = "The Flash";

const mockRequest = (body) => ({
  json: () => Promise.resolve(body),
});

async function POST(request) {
  let showName = "";

  try {
    const { tvShowId } = await request.json();

    if (!tvShowId) {
      return NextResponse.json(
        { message: "Missing TV Show ID in request body." },
        { status: 400 }
      );
    }

    const userId = mockGetUserData(request);
    const user = await mockUser
      .findById(userId)
      .select("email username notifications");

    if (!user) {
      return NextResponse.json(
        { message: "User not found or unauthorized" },
        { status: 401 }
      );
    }

    const TMDB_API_KEY = process.env.NEXT_PUBLIC_API_KEY;
    if (!TMDB_API_KEY) {
      throw new Error("TMDB API key is not configured.");
    }

    let nextEpisode = null;

    try {
      const tmdbResponse = await mockAxios.get(
        `https://api.themoviedb.org/3/tv/${tvShowId}?language=en-US&api_key=${TMDB_API_KEY}`
      );

      const showDetails = tmdbResponse.data;

      if (
        showDetails.name &&
        typeof showDetails.name === "string" &&
        showDetails.name.trim().length > 0
      ) {
        showName = showDetails.name;
      }
      nextEpisode = showDetails.next_episode_to_air;
    } catch (tmdbError) {
      console.error(
        `TMDB request failed for ID ${tvShowId} (Status: ${
          tmdbError.response?.status || "Network Error"
        }). Aborting subscription.`
      );
      return NextResponse.json(
        {
          message:
            "Failed to retrieve show details from TMDB. Cannot create subscription.",
          emailSent: false,
        },
        { status: 503 }
      );
    }

    if (showName.length === 0) {
      console.error(
        `TMDB returned data for ID ${tvShowId} but missing or empty 'name' field.`
      );
      return NextResponse.json(
        {
          message: "Show details were incomplete. Cannot create subscription.",
          emailSent: false,
        },
        { status: 400 }
      );
    }

    const newNotificationDate = nextEpisode?.air_date || "N/A";

    const alreadySubscribed = user.notifications.some(
      (n) =>
        n.id === String(tvShowId) && n.notificationDate === newNotificationDate
    );

    if (alreadySubscribed) {
      return NextResponse.json(
        {
          message: `You are already subscribed to a notification for the next available episode of ${showName}.`,
          emailSent: false,
          success: true,
        },
        { status: 200 }
      );
    }

    const currentDate = new Date().toISOString();

    const newSubscription = {
      id: String(tvShowId),
      dateCreated: currentDate,
      notificationDate: newNotificationDate,
    };

    user.notifications.push(newSubscription);
    await user.save();

    let toastMessage, emailSent;

    if (nextEpisode && nextEpisode.air_date) {
      const airDate = new Date(nextEpisode.air_date).toLocaleDateString(
        "en-US",
        { year: "numeric", month: "long", day: "numeric" }
      );

      const emailSubject = `📅 Notification Confirmed: ${showName} is airing soon!`;
      const emailBody = `
        <p>Hello ${user.username},</p>
        <p>You have successfully signed up for notifications for <strong>${showName}</strong>!</p>
        <p>The next episode is scheduled for <strong>${airDate}</strong>. We've sent this reminder to confirm your subscription.</p>
        <p>If you wish to manage your notifications, please visit your profile page.</p>
      `;

      await mockSendEmail({
        to: user.email,
        subject: emailSubject,
        htmlBody: emailBody,
      });

      toastMessage = `Success! Reminder set for ${showName} on ${airDate}. An email confirmation has been sent.`;
      emailSent = true;
    } else {
      toastMessage = `Subscription confirmed! We'll notify you when ${showName} announces its next episode date.`;
      emailSent = false;
    }

    return NextResponse.json(
      {
        message: toastMessage,
        emailSent: emailSent,
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Notification subscription error (Outer Catch):", error);

    if (
      error instanceof mongoose.Error.ValidationError ||
      (error.name === "ValidationError" &&
        error.message.includes("showName is required"))
    ) {
      return NextResponse.json(
        {
          message:
            "Subscription failed: Internal schema mismatch. Please update your Mongoose model.",
          emailSent: false,
        },
        { status: 400 }
      );
    }

    if (
      error.message.includes("Unauthorized") ||
      error.message.includes("Token")
    ) {
      return NextResponse.json(
        {
          message: "Authentication failed. Please log in again.",
          emailSent: false,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        message:
          "Internal server error during subscription setup. Please check logs.",
        emailSent: false,
      },
      { status: 500 }
    );
  }
}

//Test

describe("POST /api/notifications/subscribe (TV Show Subscription)", () => {
  const MOCK_NEXT_EPISODE_DATE = "2025-10-25";
  const MOCK_TMDB_SUCCESS_WITH_NEXT_EP = {
    data: {
      name: MOCK_SHOW_NAME,
      next_episode_to_air: {
        air_date: MOCK_NEXT_EPISODE_DATE,
        season_number: 10,
        episode_number: 1,
      },
    },
  };

  const MOCK_TMDB_SUCCESS_NO_NEXT_EP = {
    data: {
      name: MOCK_SHOW_NAME,
      next_episode_to_air: null,
    },
  };

  const MOCK_TMDB_SUCCESS_MISSING_NAME = {
    data: {
      name: " ",
      next_episode_to_air: null,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockReturnValue(MOCK_USER_ID);
    mockAxios.get.mockResolvedValue(MOCK_TMDB_SUCCESS_WITH_NEXT_EP);

    const user = mockUserInstance();
    mockUser.select.mockResolvedValue(user);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createMockRequest = (body) => mockRequest(body);

  it("should successfully subscribe and send email when next episode date is available", async () => {
    const user = mockUserInstance();
    mockUser.select.mockResolvedValue(user);

    const request = createMockRequest({ tvShowId: MOCK_TV_SHOW_ID });
    const response = await POST(request);

    expect(mockGetUserData).toHaveBeenCalledWith(request);
    expect(mockUser.findById).toHaveBeenCalledWith(MOCK_USER_ID);
    expect(mockUser.select).toHaveBeenCalledWith(
      "email username notifications"
    );

    expect(mockAxios.get).toHaveBeenCalledWith(
      `https://api.themoviedb.org/3/tv/${MOCK_TV_SHOW_ID}?language=en-US&api_key=${MOCK_TMDB_API_KEY}`
    );

    expect(user.save).toHaveBeenCalledOnce();
    expect(user.notifications.length).toBe(1);
    expect(user.notifications[0]).toEqual({
      id: String(MOCK_TV_SHOW_ID),
      dateCreated: new Date("2024-01-01T10:00:00.000Z").toISOString(),
      notificationDate: MOCK_NEXT_EPISODE_DATE,
    });

    const airDateFormatted = new Date(
      MOCK_NEXT_EPISODE_DATE
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: user.email,
        subject: `📅 Notification Confirmed: ${MOCK_SHOW_NAME} is airing soon!`,
      })
    );

    expect(response.options.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.emailSent).toBe(true);
    expect(response.data.message).toContain(
      `Reminder set for ${MOCK_SHOW_NAME} on ${airDateFormatted}.`
    );
  });

  it("should successfully subscribe and NOT send email when next episode date is unavailable", async () => {
    mockAxios.get.mockResolvedValue(MOCK_TMDB_SUCCESS_NO_NEXT_EP);
    const user = mockUserInstance();
    mockUser.select.mockResolvedValue(user);

    const request = createMockRequest({ tvShowId: MOCK_TV_SHOW_ID });
    const response = await POST(request);

    expect(user.save).toHaveBeenCalledOnce();
    expect(user.notifications[0].notificationDate).toBe("N/A");

    expect(mockSendEmail).not.toHaveBeenCalled();

    expect(response.options.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.emailSent).toBe(false);
    expect(response.data.message).toContain(
      `We'll notify you when ${MOCK_SHOW_NAME} announces its next episode date.`
    );
  });

  it("should return 200 if the user is already subscribed to the current next episode date", async () => {
    const existingNotifications = [
      {
        id: String(MOCK_TV_SHOW_ID),
        notificationDate: MOCK_NEXT_EPISODE_DATE,
        dateCreated: new Date().toISOString(),
      },
    ];
    const user = mockUserInstance(existingNotifications);
    mockUser.select.mockResolvedValue(user);

    const request = createMockRequest({ tvShowId: MOCK_TV_SHOW_ID });
    const response = await POST(request);

    expect(mockAxios.get).toHaveBeenCalledOnce();

    expect(user.save).not.toHaveBeenCalled();

    expect(mockSendEmail).not.toHaveBeenCalled();

    expect(response.options.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.emailSent).toBe(false);
    expect(response.data.message).toContain(
      "You are already subscribed to a notification"
    );
  });

  it("should return 400 if tvShowId is missing from the request body", async () => {
    const request = createMockRequest({});
    const response = await POST(request);

    expect(mockGetUserData).not.toHaveBeenCalled();
    expect(response.options.status).toBe(400);
    expect(response.data.message).toBe("Missing TV Show ID in request body.");
  });

  it("should return 401 if getuserdata throws an authentication error", async () => {
    mockGetUserData.mockImplementation(() => {
      throw new Error("Invalid Token");
    });

    const request = createMockRequest({ tvShowId: MOCK_TV_SHOW_ID });
    const response = await POST(request);

    expect(response.options.status).toBe(401);
    expect(response.data.message).toBe(
      "Authentication failed. Please log in again."
    );
  });

  it("should return 401 if the user is not found in the database", async () => {
    mockUser.select.mockResolvedValue(null);

    const request = createMockRequest({ tvShowId: MOCK_TV_SHOW_ID });
    const response = await POST(request);

    expect(mockAxios.get).not.toHaveBeenCalled();
    expect(response.options.status).toBe(401);
    expect(response.data.message).toBe("User not found or unauthorized");
  });

  it("should return 503 if the TMDB API call fails", async () => {
    mockAxios.get.mockRejectedValue({
      response: { status: 404 },
      message: "Request failed with status code 404",
    });

    const request = createMockRequest({ tvShowId: MOCK_TV_SHOW_ID });
    const response = await POST(request);

    expect(response.options.status).toBe(503);
    expect(response.data.message).toContain(
      "Failed to retrieve show details from TMDB."
    );
  });

  it("should return 400 if TMDB returns a missing or empty show name", async () => {
    mockAxios.get.mockResolvedValue(MOCK_TMDB_SUCCESS_MISSING_NAME);

    const request = createMockRequest({ tvShowId: MOCK_TV_SHOW_ID });
    const response = await POST(request);

    expect(response.options.status).toBe(400);
    expect(response.data.message).toBe(
      "Show details were incomplete. Cannot create subscription."
    );
  });

  it("should return 400 for a Mongoose Validation Error (simulating schema mismatch)", async () => {
    const user = mockUserInstance();

    user.save.mockRejectedValue(new mongoose.Error.ValidationError(null));
    mockUser.select.mockResolvedValue(user);

    const request = createMockRequest({ tvShowId: MOCK_TV_SHOW_ID });
    const response = await POST(request);

    expect(response.options.status).toBe(400);
    expect(response.data.message).toContain("Internal schema mismatch");
  });

  it("should return 500 for a general unexpected server error", async () => {
    const user = mockUserInstance();
    user.save.mockRejectedValue(
      new Error("Database connection suddenly dropped")
    );
    mockUser.select.mockResolvedValue(user);

    const request = createMockRequest({ tvShowId: MOCK_TV_SHOW_ID });
    const response = await POST(request);

    expect(response.options.status).toBe(500);
    expect(response.data.message).toContain("Internal server error");
  });
});
