import { NextResponse, NextRequest } from "next/server";
import { Database } from "@/dbconfig/database";
import User from "@/models/users";
import jwt from "jsonwebtoken";

const TOKEN_NAME = "token";
const JWT_SECRET = process.env.JWTSECRET || "";

interface JwtPayload {
  id: string;
}

export async function POST(request: NextRequest) {
  try {
    await Database();

    const token = request.cookies.get(TOKEN_NAME)?.value;
    if (!token) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    const decodedToken = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const userId = decodedToken.id;

    const { showId, type } = await request.json();

    if (!showId || type !== "tvshow") {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const updateQuery = {
      $addToSet: {
        favoriteTvShows: showId,
      },
    };

    const updatedUser = await User.findByIdAndUpdate(userId, updateQuery, {
      new: true,
    });

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "TV Show added to favorites",
        favorites: updatedUser.favoriteTvShows,
      },
      { status: 200 }
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "JsonWebTokenError"
    ) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
