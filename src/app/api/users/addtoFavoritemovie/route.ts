import { NextResponse, NextRequest } from "next/server";
import { Database } from "@/dbconfig/database";
import User from "@/models/users";
import jwt from "jsonwebtoken";

const TOKEN_NAME = "token";
const JWT_SECRET = process.env.JWTSECRET || "";

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

    const decodedToken: any = jwt.verify(token, JWT_SECRET);
    const userId = decodedToken.id;

    const { movieId, type } = await request.json();

    if (!movieId || type !== "movie") {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const updateQuery = {
      $addToSet: {
        favoriteMovies: movieId,
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
        message: "Movie added to favorites",
        favorites: updatedUser.favoriteMovies,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
