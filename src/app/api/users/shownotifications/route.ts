import { NextRequest, NextResponse } from "next/server";
import getuserdata from "@/helpers/getuserdata";
import User from "@/models/users";
import { Database } from "@/dbconfig/database";

Database();

export async function GET(request: NextRequest) {
  try {
    const userId = getuserdata(request);

    const user = await User.findById(userId).select("notifications");

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
    console.error("Error fetching notifications:", error);

    if (
      error instanceof Error &&
      (error.message.includes("token") ||
        error.message.includes("Unauthorized"))
    ) {
      return NextResponse.json(
        {
          error: "Authentication failed. Please log in.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch notifications list.",
      },
      { status: 500 }
    );
  }
}
