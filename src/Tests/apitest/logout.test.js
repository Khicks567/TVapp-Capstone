import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

//Mock

const mockCookieSet = vi.fn();

const mockNextResponse = {
  json: vi.fn((data, options) => ({
    data,
    options,
    cookies: {
      set: mockCookieSet,
    },
  })),
};

vi.mock("next/server", () => ({
  NextResponse: {
    json: mockNextResponse.json,
  },
}));

async function GET() {
  try {
    const response = NextResponse.json({
      message: "logout successful",
      success: true,
    });

    response.cookies.set("token", "", { httpOnly: true, expires: new Date(0) });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

//Test

describe("GET /api/users/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return a successful response and clear the authentication cookie", async () => {
    const response = await GET();

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      {
        message: "logout successful",
        success: true,
      },
      undefined
    );

    expect(mockCookieSet).toHaveBeenCalledWith("token", "", {
      httpOnly: true,
      expires: new Date(0),
    });

    expect(response.data.success).toBe(true);
    expect(response.cookies.set).toBe(mockCookieSet);
  });

  it("should handle internal errors gracefully (though unlikely in this simple handler)", async () => {
    const mockError = new Error("Forced JSON serialization failure");

    mockNextResponse.json.mockImplementationOnce(() => {
      throw mockError;
    });

    mockNextResponse.json.mockReturnValueOnce({
      data: { error: mockError.message },
      options: { status: 500 },
    });

    const response = await GET();

    expect(mockNextResponse.json).toHaveBeenCalledTimes(2);
    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: mockError.message },
      { status: 500 }
    );

    expect(mockCookieSet).not.toHaveBeenCalled();

    expect(response.options.status).toBe(500);
    expect(response.data.error).toBe(mockError.message);
  });
});
