"use client";

import Link from "next/link";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface ApiErrorResponse {
  error: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = React.useState({
    email: "",
    password: "",
  });

  const [buttonOff, setbuttonOff] = React.useState(true);
  const [loading, setLoading] = React.useState(false);

  const signIn = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!user.email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    const loadingToastId = toast.loading("Logging in...", {
      position: "top-center",
    });

    try {
      setLoading(true);

      const response = await axios.post("/api/users/login", user);
      console.log(response.data);

      toast.update(loadingToastId, {
        render: "Login successful! Redirecting to profile.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        delay: 500,
      });

      setTimeout(() => {
        router.push("/profile");
      }, 1000);
    } catch (error) {
      let errorMessage = "Login failed. Please check your credentials.";

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        }
      }

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
    if (user.email.length > 0 && user.password.length > 0) {
      setbuttonOff(false);
    } else {
      setbuttonOff(true);
    }
  }, [user]);

  return (
    <div className="formwhole">
      <h1 className="exacth1">
        {loading ? "Page is loading" : "Login To KTHP Tv Tracker"}
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
          onClick={signIn}
          className="pagebuttons"
          disabled={buttonOff || loading}
        >
          {buttonOff
            ? "Enter information"
            : loading
            ? "Processing..."
            : "Login"}
        </button>
      </form>
      <Link className="formlinks" href="/signup">
        Go to Sign up page
      </Link>
    </div>
  );
}
