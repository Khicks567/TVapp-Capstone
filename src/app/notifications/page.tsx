"use client";

import { useEffect, useState, useCallback } from "react";
import Navbar from "../components/nav";
import axios, { AxiosError } from "axios";
import Link from "next/link";
import { format } from "date-fns";
import { Clock, Trash2 } from "lucide-react";

interface Notification {
  id: string;
  dateCreated: string;
  notificationDate: string;
}

interface ApiErrorResponse {
  error: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNamesLoading, setIsNamesLoading] = useState(false);
  const [showNamesMap, setShowNamesMap] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatAirDate = (dateString: string) => {
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
      const rawNotifications: Notification[] = response.data.data;

      const sortedNotifications = rawNotifications.sort(
        (a, b) =>
          new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
      );
      setNotifications(sortedNotifications);
    } catch (err) {
      let errorMessage = "Failed to load notifications. Are you logged in?";
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<ApiErrorResponse>;
        if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        }
      }
      console.error("Fetch error:", errorMessage);
      setError(errorMessage);
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
      const newNames: Record<string, string> = {};

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

  const handleDeleteNotification = async (showId: string) => {
    setDeletingId(showId);
    try {
      await axios.delete(`/api/users/deletenotification`, {
        data: {
          showId: showId,
        },
      });

      setNotifications((prev) => prev.filter((notif) => notif.id !== showId));

      console.log(`Notification for show ID ${showId} deleted successfully.`);
    } catch (err) {
      let errorMessage = "Failed to delete notification.";
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<ApiErrorResponse>;
        if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        }
      }
      console.log(errorMessage);
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
      <div className="errordiv">
        <Navbar />
        <h1>Notifications</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="notificationpage">
      <Navbar />
      <section className="content">
        <section className="h1wrap">
          <h1 className="profileh1">Episode Reminders</h1>
        </section>
        {notifications.length === 0 ? (
          <div className="pagediv">
            <Clock className="w-12 h-12 mx-auto text-yellow-500 mb-4" />

            <p className="default">
              You haven&apos;t set up any episode notifications yet.
            </p>

            <p className="default">
              Go back to your favorite TV shows to set a reminder!
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((notif) => (
              <div className="fullnotfiy" key={notif.dateCreated}>
                <div className="notfiyname">
                  <h3 className="notfiyid">
                    {showNamesMap[notif.id] || notif.id}
                  </h3>
                </div>
                <div className="notfiyitems">
                  <section>
                    <p className="notfiyairdate">
                      <strong>Scheduled Air Date:</strong>
                      <span className="notfiydate">
                        {formatAirDate(notif.notificationDate)}
                      </span>
                    </p>

                    <p className="notfiyairdate">
                      <strong>Notification Created Date:</strong>
                      <span className="notfiydate">
                        {format(new Date(notif.dateCreated), "PPP")}
                      </span>
                    </p>
                  </section>
                  <div className="notfiybuttons">
                    <Link href={`/info/${notif.id}`} className="notfiyclicks">
                      View Show Details
                    </Link>

                    <button
                      onClick={() => handleDeleteNotification(notif.id)}
                      disabled={deletingId === notif.id}
                      className="notfiyclicks"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {deletingId === notif.id
                        ? "Deleting..."
                        : "Delete Reminder"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
