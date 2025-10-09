import { NextRequest, NextResponse } from "next/server";
import getuserdata from "@/helpers/getuserdata";
import User from "@/models/users";
import sendemail from "@/helpers/sendmail";
import { Database } from "@/dbconfig/database";
import axios from "axios";
import mongoose from "mongoose";

Database();

interface NextEpisode {
  air_date: string;
  [key: string]: unknown;
}

interface ShowDetails {
  name: string;
  status: "Canceled" | "Ended" | "Returning Series" | string;
  next_episode_to_air: NextEpisode | null;
  [key: string]: unknown;
}

interface CustomAxiosError extends Error {
  response?: {
    status?: number;
    data: unknown;
  };
}

export async function POST(request: NextRequest) {
  let showName: string = "";

  try {
    const { tvShowId } = await request.json();

    if (!tvShowId) {
      return NextResponse.json(
        { message: "Missing TV Show ID in request body." },
        { status: 400 }
      );
    }

    const userId = getuserdata(request);
    const user = await User.findById(userId).select(
      "email username notifications"
    );

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

    let nextEpisode: NextEpisode | null = null;
    let showDetails: ShowDetails | null = null;

    try {
      const tmdbResponse = await axios.get(
        `https://api.themoviedb.org/3/tv/${tvShowId}?language=en-US&api_key=${TMDB_API_KEY}`
      );

      showDetails = tmdbResponse.data as ShowDetails;

      if (
        showDetails.name &&
        typeof showDetails.name === "string" &&
        showDetails.name.trim().length > 0
      ) {
        showName = showDetails.name;
      }
      nextEpisode = showDetails.next_episode_to_air;
    } catch (tmdbError) {
      const error = tmdbError as CustomAxiosError;
      console.error(
        `TMDB request failed for ID ${tvShowId} (Status: ${
          error.response?.status || "Network Error"
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

    if (!showDetails || showName.length === 0) {
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

    if (showDetails.status === "Canceled" || showDetails.status === "Ended") {
      return NextResponse.json(
        {
          message: `${showName} is no longer airing new episodes (Status: ${showDetails.status}).`,
          emailSent: false,
          success: false,
        },
        { status: 200 }
      );
    }

    const newNotificationDate = nextEpisode?.air_date || "N/A";

    const alreadySubscribed = user.notifications.some(
      (n: { id: string; notificationDate: string }) =>
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

    console.log("Attempting to save new subscription:", newSubscription);

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

      await sendemail({
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

    return NextResponse.json({
      message: toastMessage,
      emailSent: emailSent,
      success: true,
    });
  } catch (error) {
    console.error("Notification subscription error (Outer Catch):", error);
    const err = error as Error;

    if (
      err instanceof mongoose.Error.ValidationError ||
      (err.name === "ValidationError" &&
        err.message.includes("showName is required"))
    ) {
      console.error(
        "Mongoose Validation Failed: **CRITICAL: Please ensure you have removed the 'showName' field from your NotificationSchema in models/users.ts.**"
      );
      return NextResponse.json(
        {
          message:
            "Subscription failed: Internal schema mismatch. Please update your Mongoose model.",
          emailSent: false,
        },
        { status: 400 }
      );
    }

    if (err.message.includes("Unauthorized") || err.message.includes("Token")) {
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
