"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import { useState, useEffect } from "react";

// Nav bar for website

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [username, setUsername] = useState<string>("");

  const navLinks = [
    { href: "/movies", label: "Movie Search" },
    { href: "/profile", label: "Profile" },
    { href: "/tvshows", label: "TV Show Search" },
  ];

  const checkUserLoggedInStatus = async () => {
    try {
      const response = await axios.get("/api/users/checktoken");

      if (response.data.user.username) {
        setUsername(response.data.user.username);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error("Login status check failed:", error);
      setIsLoggedIn(false);
      setUsername("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUserLoggedInStatus();
  }, []);

  const logout = async () => {
    try {
      await axios.get("/api/users/logout");

      setIsLoggedIn(false);
      router.push("/login");
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Logout failed:", axiosError.message);
      alert(`Logout error: ${axiosError.message}`);
    }
  };

  if (loading) {
    return <div>Loading navigation...</div>;
  }

  return (
    <div className="navdiv">
      <div className="nav-start">
        {isLoggedIn ? (
          <h3 className="username">Welcome: {username}!</h3>
        ) : (
          <h3 className="username text-lg font-semibold text-gray-400">
            Welcome: Guest
          </h3>
        )}
      </div>
      <h1 className="navh1">KTHP TV Tracker </h1>
      <div className="navlinksgroup">
        {navLinks.map(
          (link) =>
            link.href !== pathname && (
              <Link className="navlinks" key={link.href} href={link.href}>
                <h3 className="navlinks">{link.label}</h3>
              </Link>
            )
        )}

        {isLoggedIn && (
          <button onClick={logout} className="navbutton">
            Logout
          </button>
        )}
      </div>
    </div>
  );
}
