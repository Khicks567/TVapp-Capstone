"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "../components/nav";
import axios, { AxiosError } from "axios";
import { toast } from "react-toastify";
import handleNotificationSignup from "@/helpers/makenotifications";
import Image from "next/image";

interface MediaDetail {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
}

interface UserFavorites {
  favoriteMovies: number[];
  favoriteTvShows: number[];
}

interface ApiErrorResponse {
  error: string;
}

const POPUP_SEEN_KEY = "profile_welcome_popup_seen";

export default function ProfilePage() {
  const [favorites, setFavorites] = useState<UserFavorites | null>(null);
  const [favoriteTvDetails, setFavoriteTvDetails] = useState<MediaDetail[]>([]);
  const [favoriteMovieDetails, setFavoriteMovieDetails] = useState<
    MediaDetail[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [loadingTvDetails, setLoadingTvDetails] = useState(false);
  const [loadingMovieDetails, setLoadingMovieDetails] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const response = await axios.get("/api/users/showFavorites");
        setFavorites(response.data.data);
      } catch (err) {
        let errorMessage = "Failed to load user favorites. Please log in.";
        if (axios.isAxiosError(err)) {
          const axiosError = err as AxiosError<ApiErrorResponse>;
          errorMessage = axiosError.response?.data?.error || err.message;
        }
        console.error("Fetch error:", errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, []);

  useEffect(() => {
    if (!loading && favorites) {
      const hasNoFavorites =
        favorites.favoriteMovies.length === 0 &&
        favorites.favoriteTvShows.length === 0;

      const popupSeen = localStorage.getItem(POPUP_SEEN_KEY);

      if (hasNoFavorites && !popupSeen) {
        toast.info(
          <div>
            <p style={{ fontWeight: "bold" }}>Welcome to your Profile!</p>
            <p>
              Add your favorite Movies and TV Shows and come back to this page
              to view and manage them.
            </p>
            <p>
              Click on See Your Notifications to see the alerts you&apos;ve set
              up.
            </p>
          </div>,
          {
            position: "top-center",
            autoClose: 10000,
            closeOnClick: true,
            pauseOnHover: true,
          }
        );

        localStorage.setItem(POPUP_SEEN_KEY, "true");
      }
    }
  }, [loading, favorites]);

  useEffect(() => {
    if (favorites && favorites.favoriteTvShows.length > 0) {
      setLoadingTvDetails(true);

      const fetchTvDetails = async () => {
        const tvIds = favorites.favoriteTvShows;
        const tmdbKey = process.env.NEXT_PUBLIC_API_KEY;

        if (!tmdbKey) {
          console.error("NEXT_PUBLIC_API_KEY is not set.");
          setLoadingTvDetails(false);
          return;
        }

        const detailPromises = tvIds.map((id) =>
          axios.get(
            `https://api.themoviedb.org/3/tv/${id}?language=en-US&api_key=${tmdbKey}`
          )
        );

        try {
          const results = await Promise.all(detailPromises);
          const tvDetails: MediaDetail[] = results.map((res) => res.data);
          setFavoriteTvDetails(tvDetails);
        } catch (e) {
          console.error("Failed to fetch TV show details from TMDB:", e);
        } finally {
          setLoadingTvDetails(false);
        }
      };
      fetchTvDetails();
    } else if (favorites && favorites.favoriteTvShows.length === 0) {
      setFavoriteTvDetails([]);
    }
  }, [favorites]);

  useEffect(() => {
    if (favorites && favorites.favoriteMovies.length > 0) {
      setLoadingMovieDetails(true);

      const fetchMovieDetails = async () => {
        const movieIds = favorites.favoriteMovies;
        const tmdbKey = process.env.NEXT_PUBLIC_API_KEY;

        if (!tmdbKey) {
          console.error("NEXT_PUBLIC_API_KEY is not set.");
          setLoadingMovieDetails(false);
          return;
        }

        const detailPromises = movieIds.map((id) =>
          axios.get(
            `https://api.themoviedb.org/3/movie/${id}?language=en-US&api_key=${tmdbKey}`
          )
        );

        try {
          const results = await Promise.all(detailPromises);
          const movieDetails: MediaDetail[] = results.map((res) => res.data);
          setFavoriteMovieDetails(movieDetails);
        } catch (e) {
          console.error("Failed to fetch Movie details from TMDB:", e);
        } finally {
          setLoadingMovieDetails(false);
        }
      };
      fetchMovieDetails();
    } else if (favorites && favorites.favoriteMovies.length === 0) {
      setFavoriteMovieDetails([]);
    }
  }, [favorites]);

  const handleRemoveMovie = async (movieId: number) => {
    try {
      await axios.post("/api/users/RemovefromFavorite", {
        mediaId: movieId,
        mediaType: "movie",
        action: "remove",
      });

      setFavorites((prev) =>
        prev
          ? {
              ...prev,
              favoriteMovies: prev.favoriteMovies.filter(
                (id) => id !== movieId
              ),
            }
          : null
      );
      setFavoriteMovieDetails((prevDetails) =>
        prevDetails.filter((movie) => movie.id !== movieId)
      );

      toast.success("Movie successfully removed from favorites! 🗑️");
    } catch (err) {
      console.error("Failed to remove movie from favorites:", err);
      toast.error("Failed to remove movie. Please try again.");
    }
  };

  const handleRemoveTvShow = async (tvShowId: number) => {
    try {
      await axios.post("/api/users/RemovefromFavorite", {
        mediaId: tvShowId,
        mediaType: "tv",
        action: "remove",
      });

      setFavorites((prev) =>
        prev
          ? {
              ...prev,
              favoriteTvShows: prev.favoriteTvShows.filter(
                (id) => id !== tvShowId
              ),
            }
          : null
      );
      setFavoriteTvDetails((prevDetails) =>
        prevDetails.filter((show) => show.id !== tvShowId)
      );

      toast.success("TV Show successfully removed from favorites! 🗑️");
    } catch (err) {
      console.error("Failed to remove TV show from favorites:", err);
      toast.error("Failed to remove TV show. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <Navbar />
        <h1>Loading Profile...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Navbar />
        <h1>Profile Error</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  const imageBaseUrl = "https://image.tmdb.org/t/p/w200";

  return (
    <div className="fullpage">
      <Navbar />
      <section className="content">
        <div className="h1wrap">
          <h1 className="profileh1">Your Profile</h1>
          <Link href="/notifications" className="notfiy">
            See Your Notifications 🔔
          </Link>
        </div>

        <section className="profilemovies">
          <span className="profileh2">
            <h2>Favorite Movies 🎬</h2>
          </span>
          {favorites?.favoriteMovies.length === 0 ? (
            <p className="default">
              You haven&apos;t added any favorite movies yet.
            </p>
          ) : loadingMovieDetails ? (
            <p>Loading movie details...</p>
          ) : (
            <div className="listofcontent">
              {favoriteMovieDetails.map((movie) => (
                <div key={movie.id} className="eachitem">
                  {movie.poster_path ? (
                    <Link href={`/info/movie/${movie.id}`}>
                      <Image
                        src={`${imageBaseUrl}${movie.poster_path}`}
                        alt={movie.title || "Movie Poster"}
                        className="contentimg"
                        width={200}
                        height={300}
                      />
                    </Link>
                  ) : (
                    <div className="default">No Poster</div>
                  )}
                  <h3>{movie.title}</h3>
                  <button
                    onClick={() => handleRemoveMovie(movie.id)}
                    className="profilebutton"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <hr className="hr" />

        <section className="profilemovies">
          <span className="profileh2">
            <h2>Favorite TV Shows 📺</h2>
          </span>
          {favorites?.favoriteTvShows.length === 0 ? (
            <p className="default">
              You haven&apos;t added any favorite TV shows yet.
            </p>
          ) : loadingTvDetails ? (
            <p>Loading TV show details...</p>
          ) : (
            <div className="listofcontent">
              {favoriteTvDetails.map((show) => (
                <div key={show.id} className="eachitem">
                  {show.poster_path ? (
                    <Link href={`/info/${show.id}`}>
                      <Image
                        src={`${imageBaseUrl}${show.poster_path}`}
                        alt={show.name || "TV Show Poster"}
                        className="contentimg"
                      />
                    </Link>
                  ) : (
                    <div className="default">No Poster</div>
                  )}
                  <h3>{show.name}</h3>

                  <button
                    onClick={() => handleRemoveTvShow(show.id)}
                    className="profilebutton"
                  >
                    Remove
                  </button>

                  <button
                    onClick={() => handleNotificationSignup(show.id)}
                    className="profilebuttonextra"
                  >
                    Get Latest Episode Alert
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
