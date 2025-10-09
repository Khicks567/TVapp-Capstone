import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { toast } from "react-toastify";

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const handleNotificationSignup = async (tvShowId) => {
  try {
    const response = await axios.post("/api/users/notifyusers", {
      tvShowId: tvShowId,
    });

    const { message, emailSent } = response.data;

    if (emailSent) {
      toast.success(message);
    } else {
      toast.info(message);
    }
  } catch (err) {
    console.error("Failed to sign up for notification:", err);
    const errorMessage =
      err.response?.data?.message ||
      "Error: Could not set up notification. Please log in or try again.";

    if (errorMessage.includes("already subscribed")) {
      toast.info(errorMessage);
    } else {
      toast.error(errorMessage);
    }
  }
};

describe("handleNotificationSignup", () => {
  const MOCK_SHOW_ID = 1001;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call the correct API endpoint with the show ID", async () => {
    axios.post.mockResolvedValue({
      data: { message: "Success", emailSent: true },
    });

    await handleNotificationSignup(MOCK_SHOW_ID);

    expect(axios.post).toHaveBeenCalledWith("/api/users/notifyusers", {
      tvShowId: MOCK_SHOW_ID,
    });
  });

  it("should show toast.success for successful response when emailSent is true", async () => {
    const successMessage = "Reminder set for show on 2025-01-01.";
    axios.post.mockResolvedValue({
      data: { message: successMessage, emailSent: true },
    });

    await handleNotificationSignup(MOCK_SHOW_ID);

    expect(toast.success).toHaveBeenCalledWith(successMessage);
    expect(toast.info).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("should show toast.info for successful response when emailSent is false", async () => {
    const infoMessage = "Subscription confirmed, no upcoming episode found.";
    axios.post.mockResolvedValue({
      data: { message: infoMessage, emailSent: false },
    });

    await handleNotificationSignup(MOCK_SHOW_ID);

    expect(toast.info).toHaveBeenCalledWith(infoMessage);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("should show toast.info if the subscription already exists (400 response)", async () => {
    const existingMessage = "You are already subscribed to a notification.";
    axios.post.mockRejectedValue({
      response: { data: { message: existingMessage } },
    });

    await handleNotificationSignup(MOCK_SHOW_ID);

    expect(toast.info).toHaveBeenCalledWith(existingMessage);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("should show toast.error for a generic API error (non-subscription message)", async () => {
    const errorMessage = "Authentication failed. Please log in again.";
    axios.post.mockRejectedValue({
      response: { data: { message: errorMessage } },
    });

    await handleNotificationSignup(MOCK_SHOW_ID);

    expect(toast.error).toHaveBeenCalledWith(errorMessage);
    expect(toast.info).not.toHaveBeenCalled();
  });

  it("should show a default toast.error message for network or non-response errors", async () => {
    axios.post.mockRejectedValue(new Error("Network Error"));

    await handleNotificationSignup(MOCK_SHOW_ID);

    expect(toast.error).toHaveBeenCalledWith(
      "Error: Could not set up notification. Please log in or try again."
    );
  });
});
