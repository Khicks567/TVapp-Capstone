import { NextRequest, NextResponse } from "next/server";
import getUserIdFromToken from "@/helpers/getuserdata";
import User from "@/models/users";
import { Database } from "@/dbconfig/database";

export async function GET(request: NextRequest) {
  try {
    await Database();

    const userId = getUserIdFromToken(request);

    const user = await User.findById(userId).select(
      "favoriteMovies favoriteTvShows"
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "User favorites fetched successfully",
      success: true,
      data: {
        favoriteMovies: user.favoriteMovies,
        favoriteTvShows: user.favoriteTvShows,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    console.error("Error fetching favorites:", errorMessage);

    if (
      errorMessage.includes("token") ||
      errorMessage.includes("Unauthorized")
    ) {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
