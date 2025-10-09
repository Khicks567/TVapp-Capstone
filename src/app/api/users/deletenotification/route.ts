import { NextRequest, NextResponse } from "next/server";

import getUserIdFromToken from "@/helpers/getuserdata";

import User from "@/models/users";

export async function DELETE(request: NextRequest) {
  let userId: string;

  try {
    userId = getUserIdFromToken(request);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Authentication error." },
      { status: 401 }
    );
  }

  let showId: string;
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
    const updatedUser = await User.findOneAndUpdate(
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
