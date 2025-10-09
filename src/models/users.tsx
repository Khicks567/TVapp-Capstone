import mongoose, { Schema } from "mongoose";

const NotificationSchema = new Schema({
  id: { type: String, required: true },
  dateCreated: { type: String, required: true },
  notificationDate: { type: String, required: true },
});

// User Schema

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Please enter a username."],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please enter an email."],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Please enter a password."],
      minlength: [8, "Password must be at least 8 characters long."],
      select: false,
    },

    favoriteMovies: {
      type: [Number],
      default: [],
    },
    favoriteTvShows: {
      type: [Number],
      default: [],
    },

    notifications: {
      type: [NotificationSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.models.user || mongoose.model("user", UserSchema);

export default User;
