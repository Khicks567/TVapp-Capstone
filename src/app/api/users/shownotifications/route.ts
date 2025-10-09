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
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch notifications list.",
      },
      { status: 500 }
    );
  }
}
