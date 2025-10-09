"use client";

import Link from "next/link";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { toast } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

export default function Siginup() {
  const router = useRouter();
  const [user, setUser] = React.useState({
    email: "",
    password: "",
    username: "",
  });

  const [buttonOff, setbuttonOff] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const register = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!user.email.includes("@")) {
      toast.error("Email must contain the '@' symbol.");
      return;
    }

    if (user.password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    const loadingToastId = toast.loading("Creating account...", {
      position: "top-center",
    });

    try {
      setLoading(true);

      const response = await axios.post("/api/users/signup", user);
      console.log(response.data);

      toast.update(loadingToastId, {
        render: "Registration successful! Redirecting to login.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        delay: 500,
      });

      setTimeout(() => {
        router.push("/login");
      }, 1000);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "An unknown error occurred.";

      toast.update(loadingToastId, {
        render: errorMessage,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      user.email.length > 0 &&
      user.username.length > 0 &&
      user.password.length > 0
    ) {
      setbuttonOff(false);
    } else {
      setbuttonOff(true);
    }
  }, [user]);

  return (
    <div className="formwhole">
      <h1 className="exacth1">
        {loading ? "Page is loading" : "Sign Up For KTHP Tv Tracker"}
      </h1>
      <form className="forminfo">
        <section className="forminputs">
          <label htmlFor="email" className="exactlabels">
            Email:
          </label>
          <input
            type="email"
            placeholder="Enter Email"
            name="email"
            id="email"
            value={user.email}
            onChange={(e) => setUser({ ...user, email: e.target.value })}
            className="exactinputs"
          />
        </section>

        <section className="forminputs">
          <label htmlFor="username" className="exactlabels">
            Username:
          </label>
          <input
            type="text"
            placeholder="Enter Username"
            name="username"
            id="username"
            value={user.username}
            onChange={(e) => setUser({ ...user, username: e.target.value })}
            className="exactinputs"
          />
        </section>
        <section className="forminputs">
          <label htmlFor="password" className="exactlabels">
            Password:
          </label>
          <input
            type="password"
            placeholder="Enter Password"
            name="password"
            id="password"
            value={user.password}
            onChange={(e) => setUser({ ...user, password: e.target.value })}
            className="exactinputs"
          />
        </section>
        <button
          onClick={register}
          className="pagebuttons"
          disabled={buttonOff || loading}
        >
          {buttonOff
            ? "Enter information"
            : loading
            ? "Processing..."
            : "Sign Up"}
        </button>
      </form>
      <Link className="formlinks" href="/login">
        Go to login page
      </Link>
    </div>
  );
}
