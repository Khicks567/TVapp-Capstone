import { Database } from "@/dbconfig/database";
import User from "@/models/users";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

Database();

export async function POST(req: NextRequest) {
  try {
    const reqBody = await req.json();

    const { username, email, password } = reqBody;

    console.log(reqBody);

    const userExists = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (userExists) {
      let errorMessage = "User already exists";
      if (userExists.email === email) {
        errorMessage = "A user with this email already exists";
      } else if (userExists.username === username) {
        errorMessage = "This username is already taken";
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashed,
    });

    await newUser.save();

    return NextResponse.json({
      message: "User has been created",
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
