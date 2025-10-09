import { NextRequest, NextResponse } from "next/server";
import User from "@/models/users";
import { Database } from "@/dbconfig/database";
import getUserIdFromToken from "@/helpers/getuserdata";

Database();

export async function POST(request: NextRequest) {
  try {
    const reqBody = await request.json();
    const { mediaId, mediaType } = reqBody;

    const userId = getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const updateField =
      mediaType === "movie" ? "favoriteMovies" : "favoriteTvShows";

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $pull: { [updateField]: mediaId },
      },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: `${mediaType} removed successfully`,
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error("Toggle favorite error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unknown error occurred" },
      { status: 500 }
    );
  }
}
