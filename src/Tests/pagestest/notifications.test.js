import React, { useEffect, useState, useCallback } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { format } from "date-fns";

const Navbar = vi.fn(() => null);
const Link = ({ children, href }) => <a href={href}>{children}</a>;
const Clock = vi.fn(() => <span>ClockIcon</span>);
const Trash2 = vi.fn(() => <span>TrashIcon</span>);

vi.mock("../components/nav", () => ({ default: Navbar }));
vi.mock("next/link", () => ({ default: Link }));
vi.mock("lucide-react", () => ({ Clock, Trash2 }));
vi.mock("axios");

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNamesLoading, setIsNamesLoading] = useState(false);
  const [showNamesMap, setShowNamesMap] = useState({});
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const formatAirDate = (dateString) => {
    if (dateString === "N/A") {
      return "TBD (Checking Daily)";
    }
    try {
      if (new Date(dateString) < new Date()) {
        return `${format(new Date(dateString), "MMM d, yyyy")} (Past)`;
      }
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/api/users/shownotifications");
      const rawNotifications = response.data.data;

      const sortedNotifications = rawNotifications.sort(
        (a, b) =>
          new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
      );
      setNotifications(sortedNotifications);
    } catch (err) {
      console.error("Fetch error:", err.response?.data?.error || err.message);
      setError("Failed to load notifications. Are you logged in?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (loading || error || notifications.length === 0) return;

    const fetchShowNames = async () => {
      setIsNamesLoading(true);
      const uniqueShowIds = Array.from(new Set(notifications.map((n) => n.id)));
      const newNames = {};

      const TMDB_API_KEY = process.env.NEXT_PUBLIC_API_KEY;
      if (!TMDB_API_KEY) {
        console.error("TMDB API key is missing. Cannot fetch show names.");
        setIsNamesLoading(false);
        return;
      }

      const namePromises = uniqueShowIds.map(async (id) => {
        if (showNamesMap[id]) return;

        try {
          const response = await axios.get(
            `https://api.themoviedb.org/3/tv/${id}?language=en-US&api_key=${TMDB_API_KEY}`
          );
          newNames[id] = response.data.name || "Unknown Show";
        } catch (e) {
          console.error(`Failed to fetch name for show ID ${id}`, e);
          newNames[id] = "Show Name Unavailable";
        }
      });

      await Promise.all(namePromises);
      setShowNamesMap((prev) => ({ ...prev, ...newNames }));
      setIsNamesLoading(false);
    };

    fetchShowNames();
  }, [notifications, loading, error, showNamesMap]);

  const handleDeleteNotification = async (showId) => {
    setDeletingId(showId);
    try {
      await axios.delete(`/api/users/deletenotification`, {
        data: {
          showId: showId,
        },
      });

      setNotifications((prev) => prev.filter((notif) => notif.id !== showId));

      console.log(`Notification for show ID ${showId} deleted successfully.`);
    } catch (_err) {
      // ... error handling
    } finally {
      setDeletingId(null);
    }
  };

  if (loading || (notifications.length > 0 && isNamesLoading)) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <Navbar />
        <h1 className="text-3xl font-bold mb-8 mt-4">Notifications</h1>
        <p>
          {loading
            ? "Loading user notifications..."
            : "Fetching TV show details..."}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <Navbar />
        <h1 className="text-3xl font-bold mb-8 mt-4">Notifications</h1>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 font-sans">
      <Navbar />
      <h1 className="text-4xl font-extrabold mb-8 text-indigo-400">
        Episode Reminders
      </h1>

      {notifications.length === 0 ? (
        <div className="text-center p-12 bg-gray-800 rounded-xl shadow-xl">
          <Clock className="w-12 h-12 mx-auto text-yellow-500 mb-4" />

          <p className="text-lg">
            You haven&apos;t set up any episode notifications yet.
          </p>

          <p className="text-gray-400 mt-2">
            Go back to your favorite TV shows to set a reminder!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif) => (
            <div
              key={notif.dateCreated}
              className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700 hover:border-indigo-500 transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-indigo-300">
                  {showNamesMap[notif.id] || notif.id}
                </h3>
              </div>

              <p className="text-sm text-gray-400 mt-3">
                <strong className="text-gray-200">Scheduled Air Date:</strong>

                <span className="ml-2">
                  {formatAirDate(notif.notificationDate)}
                </span>
              </p>

              <p className="text-xs text-gray-500 mt-1">
                <strong className="text-gray-400">
                  Notification Created Date:
                </strong>

                <span className="ml-2">
                  {format(new Date(notif.dateCreated), "PPP")}
                </span>
              </p>

              <div className="mt-4 pt-3 border-t border-gray-700 flex justify-between items-center">
                <Link
                  href={`/info/${notif.id}`}
                  className="text-sm text-indigo-400 hover:text-indigo-200 transition-colors font-medium"
                >
                  View Show Details &rarr;
                </Link>

                <button
                  onClick={() => handleDeleteNotification(notif.id)}
                  disabled={deletingId === notif.id}
                  className={`flex items-center text-red-400 text-sm font-medium hover:text-red-300 transition-colors p-1 rounded ${
                    deletingId === notif.id
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {deletingId === notif.id ? "Deleting..." : "Delete Reminder"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const mockNotifications = [
  {
    id: "100",
    dateCreated: new Date("2024-01-01T10:00:00Z").toISOString(),
    notificationDate: "2025-05-20",
  },
  {
    id: "200",
    dateCreated: new Date("2024-01-05T15:30:00Z").toISOString(),
    notificationDate: "N/A",
  },
  {
    id: "300",
    dateCreated: new Date("2023-12-01T08:00:00Z").toISOString(),
    notificationDate: "2022-03-15",
  },
];

const mockShowDetails = {
  100: { data: { name: "Show Alpha" } },
  200: { data: { name: "Show Beta" } },
  300: { data: { name: "Show Gamma" } },
};

describe("NotificationsPage", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_API_KEY = "mock-tmdb-key";
  });

  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockClear();
    axios.delete.mockClear();
  });

  it("should display loading text initially and then render notifications", async () => {
    axios.get
      .mockResolvedValueOnce({ data: { data: mockNotifications } })
      .mockImplementation((url) => {
        if (url.includes("/tv/100"))
          return Promise.resolve(mockShowDetails["100"]);
        if (url.includes("/tv/200"))
          return Promise.resolve(mockShowDetails["200"]);
        if (url.includes("/tv/300"))
          return Promise.resolve(mockShowDetails["300"]);
        return Promise.reject(new Error("not found"));
      });

    render(<NotificationsPage />);

    expect(
      screen.getByText("Loading user notifications...")
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("Loading user notifications...")).toBeNull();
    });

    await waitFor(() => {
      expect(screen.getByText("Show Alpha")).toBeInTheDocument();
      expect(screen.getByText("Show Beta")).toBeInTheDocument();
      expect(screen.getByText("Show Gamma")).toBeInTheDocument();
    });

    expect(axios.get).toHaveBeenCalledTimes(4);
    expect(axios.get).toHaveBeenCalledWith("/api/users/shownotifications");
  });

  it("should display empty state when no notifications are present", async () => {
    axios.get.mockResolvedValueOnce({ data: { data: [] } });

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("You haven't set up any episode notifications yet.")
      ).toBeInTheDocument();
    });
  });

  it("should display error state if fetching notifications fails", async () => {
    axios.get.mockRejectedValueOnce({
      response: { data: { error: "Auth failed" } },
    });

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load notifications. Are you logged in?")
      ).toBeInTheDocument();
    });
  });

  it("should correctly format notification dates and sort by creation date", async () => {
    axios.get
      .mockResolvedValueOnce({ data: { data: mockNotifications } })
      .mockImplementation((url) => {
        if (url.includes("/tv/100"))
          return Promise.resolve(mockShowDetails["100"]);
        if (url.includes("/tv/200"))
          return Promise.resolve(mockShowDetails["200"]);
        if (url.includes("/tv/300"))
          return Promise.resolve(mockShowDetails["300"]);
        return Promise.reject(new Error("not found"));
      });

    render(<NotificationsPage />);

    await waitFor(() => {
      const showNames = screen
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent);
      expect(showNames[0]).toBe("Show Beta");
      expect(showNames[1]).toBe("Show Alpha");
      expect(showNames[2]).toBe("Show Gamma");
    });

    await waitFor(() => {
      expect(screen.getByText(/TBD \(Checking Daily\)/i)).toBeInTheDocument();
      expect(screen.getByText("May 20, 2025")).toBeInTheDocument();
      expect(screen.getByText("Mar 15, 2022 (Past)")).toBeInTheDocument();
    });
  });

  it("should call delete endpoint and remove notification from the list when delete button is clicked", async () => {
    axios.get
      .mockResolvedValueOnce({ data: { data: mockNotifications } })
      .mockImplementation((url) => {
        if (url.includes("/tv/100"))
          return Promise.resolve(mockShowDetails["100"]);
        if (url.includes("/tv/200"))
          return Promise.resolve(mockShowDetails["200"]);
        if (url.includes("/tv/300"))
          return Promise.resolve(mockShowDetails["300"]);
        return Promise.reject(new Error("not found"));
      });

    axios.delete.mockResolvedValue({});

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Show Alpha")).toBeInTheDocument();
      expect(screen.getByText("Show Beta")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const deleteButtons = screen.getAllByRole("button", {
      name: /Delete Reminder/i,
    });

    const showAlphaButton = deleteButtons.find(
      (btn) =>
        btn.closest("div").querySelector("h3").textContent === "Show Alpha"
    );

    await user.click(showAlphaButton);

    expect(screen.getByText("Deleting...")).toBeInTheDocument();

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        "/api/users/deletenotification",
        { data: { showId: "100" } }
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("Show Alpha")).not.toBeInTheDocument();
      expect(screen.queryByText("Deleting...")).toBeNull();
      expect(screen.getByText("Show Beta")).toBeInTheDocument();
    });
  });

  it("should show the show ID if the TMDB API fails to return a show name", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: "999",
              dateCreated: new Date().toISOString(),
              notificationDate: "2025-01-01",
            },
          ],
        },
      })
      .mockRejectedValue(new Error("TMDB failure"));

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText("999")).toBeInTheDocument();
    });
  });
});
