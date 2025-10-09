import React, { useEffect, useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";

const Link = ({ children, href, className, onClick }) => (
  <a href={href} className={className} onClick={onClick}>
    {children}
  </a>
);
const Navbar = vi.fn(() => null);
const toast = {
  success: vi.fn(),
  error: vi.fn(),
};
const handleNotificationSignup = vi.fn();

vi.mock("../components/nav", () => ({ default: Navbar }));
vi.mock("next/link", () => ({ default: Link }));
vi.mock("react-toastify", () => ({ toast }));
vi.mock("@/helpers/makenotifications", () => ({
  default: handleNotificationSignup,
}));
vi.mock("axios");

function ProfilePage() {
  const [favorites, setFavorites] = useState(null);
  const [favoriteTvDetails, setFavoriteTvDetails] = useState([]);
  const [favoriteMovieDetails, setFavoriteMovieDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTvDetails, setLoadingTvDetails] = useState(false);
  const [loadingMovieDetails, setLoadingMovieDetails] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const response = await axios.get("/api/users/showFavorites");
        setFavorites(response.data.data);
      } catch (err) {
        console.error("Fetch error:", err.response?.data?.error || err.message);
        setError("Failed to load user favorites. Please log in.");
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, []);

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
          const tvDetails = results.map((res) => res.data);
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
          const movieDetails = results.map((res) => res.data);
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

  const handleRemoveMovie = async (movieId) => {
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

  const handleRemoveTvShow = async (tvShowId) => {
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

  const imageBaseUrl = "https://image.tmdb.org/t/p/w200";

  if (loading) {
    return (
      <div className="p-4">
        <Navbar />
        <h1 className="text-3xl font-bold mt-4">Loading Profile...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Navbar />
        <h1 className="text-3xl font-bold mt-4">Profile Error</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Navbar />
      <h1 className="text-3xl font-bold mb-6 mt-4">Your Profile</h1>

      <Link
        href="/notifications"
        className="inline-block px-4 py-2 mb-6 text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition duration-150"
      >
        See Your Notifications 🔔
      </Link>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Favorite Movies 🎬</h2>
        {favorites?.favoriteMovies.length === 0 ? (
          <p className="text-gray-500">
            You haven&apos;t added any favorite movies yet.
          </p>
        ) : loadingMovieDetails ? (
          <p>Loading movie details...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {favoriteMovieDetails.map((movie) => (
              <div
                key={movie.id}
                className="bg-gray-800 p-3 rounded-xl shadow-lg flex flex-col"
              >
                {movie.poster_path ? (
                  <Link
                    href={`/info/movie/${movie.id}`}
                    className="block flex-shrink-0"
                  >
                    <img
                      src={`${imageBaseUrl}${movie.poster_path}`}
                      alt={movie.title || "Movie Poster"}
                      className="w-full rounded-lg mb-2 transform hover:scale-[1.02] transition duration-300"
                    />
                  </Link>
                ) : (
                  <div className="bg-gray-700 h-64 flex items-center justify-center rounded-lg mb-2 text-white">
                    No Poster
                  </div>
                )}
                <h3 className="text-lg font-medium text-white truncate my-1">
                  {movie.title}
                </h3>
                <button
                  onClick={() => handleRemoveMovie(movie.id)}
                  className="mt-auto px-3 py-1 text-sm text-red-100 bg-red-600 rounded-md hover:bg-red-700 transition duration-150"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="my-8 border-gray-700" />

      <section>
        <h2 className="text-2xl font-semibold mb-4">Favorite TV Shows 📺</h2>
        {favorites?.favoriteTvShows.length === 0 ? (
          <p className="text-gray-500">
            You haven&apos;t added any favorite TV shows yet.
          </p>
        ) : loadingTvDetails ? (
          <p>Loading TV show details...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {favoriteTvDetails.map((show) => (
              <div
                key={show.id}
                className="bg-gray-800 p-3 rounded-xl shadow-lg flex flex-col"
              >
                {show.poster_path ? (
                  <Link
                    href={`/info/tv/${show.id}`}
                    className="block flex-shrink-0"
                  >
                    <img
                      src={`${imageBaseUrl}${show.poster_path}`}
                      alt={show.name || "TV Show Poster"}
                      className="w-full rounded-lg mb-2 transform hover:scale-[1.02] transition duration-300"
                    />
                  </Link>
                ) : (
                  <div className="bg-gray-700 h-64 flex items-center justify-center rounded-lg mb-2 text-white">
                    No Poster
                  </div>
                )}
                <h3 className="text-lg font-medium text-white truncate my-1">
                  {show.name}
                </h3>

                <button
                  onClick={() => handleRemoveTvShow(show.id)}
                  className="mt-2 px-3 py-1 text-sm text-red-100 bg-red-600 rounded-md hover:bg-red-700 transition duration-150"
                >
                  Remove
                </button>

                <button
                  onClick={() => handleNotificationSignup(show.id)}
                  className="mt-2 px-3 py-1 text-sm text-blue-100 bg-green-600 rounded-md hover:bg-green-700 transition duration-150 shadow-md"
                >
                  Get Latest Episode Alert
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const mockFavorites = {
  favoriteMovies: [101, 102],
  favoriteTvShows: [201, 202],
};

const mockMovieDetails = {
  101: { id: 101, title: "Movie Alpha", poster_path: "/pa.jpg" },
  102: { id: 102, title: "Movie Beta", poster_path: null },
};

const mockTvDetails = {
  201: { id: 201, name: "Show One", poster_path: "/sb.jpg" },
  202: { id: 202, name: "Show Two", poster_path: null },
};

const mockAxiosGetImplementation = (url) => {
  if (url === "/api/users/showFavorites") {
    return Promise.resolve({ data: { data: mockFavorites } });
  }
  const tmdbKey = process.env.NEXT_PUBLIC_API_KEY;
  if (url.includes(`movie/101?language=en-US&api_key=${tmdbKey}`)) {
    return Promise.resolve({ data: mockMovieDetails[101] });
  }
  if (url.includes(`movie/102?language=en-US&api_key=${tmdbKey}`)) {
    return Promise.resolve({ data: mockMovieDetails[102] });
  }
  if (url.includes(`tv/201?language=en-US&api_key=${tmdbKey}`)) {
    return Promise.resolve({ data: mockTvDetails[201] });
  }
  if (url.includes(`tv/202?language=en-US&api_key=${tmdbKey}`)) {
    return Promise.resolve({ data: mockTvDetails[202] });
  }
  return Promise.reject(new Error(`Unexpected GET request to ${url}`));
};

describe("ProfilePage", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_API_KEY = "mock-tmdb-key";
  });

  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockClear();
    axios.post.mockClear();
    axios.get.mockImplementation(mockAxiosGetImplementation);
    axios.post.mockResolvedValue({ data: { message: "Success" } });
  });

  it("should display loading text on initial render", () => {
    render(<ProfilePage />);
    expect(screen.getByText("Loading Profile...")).toBeInTheDocument();
  });

  it("should display error message if fetching favorites fails", async () => {
    axios.get.mockRejectedValueOnce({
      response: { data: { error: "Auth failed" } },
    });
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Profile Error")).toBeInTheDocument();
      expect(
        screen.getByText("Failed to load user favorites. Please log in.")
      ).toBeInTheDocument();
    });
  });

  it("should fetch and display both favorite movies and TV shows", async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/users/showFavorites");
    });

    await waitFor(
      () => {
        expect(screen.getByText("Movie Alpha")).toBeInTheDocument();
        expect(screen.getByText("Show One")).toBeInTheDocument();
        expect(screen.getByText("Movie Beta")).toBeInTheDocument();
        expect(screen.getByText("Show Two")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const movieAlphaImg = screen.getByAltText("Movie Alpha");
    expect(movieAlphaImg).toHaveAttribute(
      "src",
      "https://image.tmdb.org/t/p/w200/pa.jpg"
    );
    expect(screen.getAllByText("Remove")[0]).toBeInTheDocument();

    const showOneLink = screen
      .getByText("Show One")
      .closest("div")
      .querySelector("a");
    expect(showOneLink).toHaveAttribute("href", "/info/tv/201");
    expect(screen.getByText("Get Latest Episode Alert")).toBeInTheDocument();
  });

  it("should display empty message for movies if favoriteMovies array is empty", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: { data: { favoriteMovies: [], favoriteTvShows: [201] } },
      })
      .mockImplementation(mockAxiosGetImplementation);

    render(<ProfilePage />);

    await waitFor(() => {
      expect(
        screen.getByText("You haven't added any favorite movies yet.")
      ).toBeInTheDocument();
      expect(screen.getByText("Show One")).toBeInTheDocument();
    });
  });

  it("should handle removing a movie correctly", async () => {
    render(<ProfilePage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Movie Beta")).toBeInTheDocument();
    });

    const removeButton = screen
      .getByText("Movie Beta")
      .closest("div")
      .querySelector("button");
    await user.click(removeButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/users/RemovefromFavorite", {
        mediaId: 102,
        mediaType: "movie",
        action: "remove",
      });
      expect(toast.success).toHaveBeenCalledWith(
        "Movie successfully removed from favorites! 🗑️"
      );
    });

    expect(screen.queryByText("Movie Beta")).not.toBeInTheDocument();
    expect(screen.getByText("Movie Alpha")).toBeInTheDocument();
  });

  it("should handle removing a TV show correctly", async () => {
    render(<ProfilePage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Show Two")).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByText("Remove");
    const showTwoRemoveButton = removeButtons.find(
      (btn) => btn.closest("div").querySelector("h3").textContent === "Show Two"
    );
    await user.click(showTwoRemoveButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/users/RemovefromFavorite", {
        mediaId: 202,
        mediaType: "tv",
        action: "remove",
      });
      expect(toast.success).toHaveBeenCalledWith(
        "TV Show successfully removed from favorites! 🗑️"
      );
    });

    expect(screen.queryByText("Show Two")).not.toBeInTheDocument();
    expect(screen.getByText("Show One")).toBeInTheDocument(); // One should still be there
  });

  it("should call handleNotificationSignup when alert button is clicked", async () => {
    render(<ProfilePage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Show One")).toBeInTheDocument();
    });

    const alertButton = screen
      .getByText("Show One")
      .closest("div")
      .querySelector("button:last-child");
    await user.click(alertButton);

    expect(handleNotificationSignup).toHaveBeenCalledWith(201);
  });

  it("should show error toast if movie removal fails", async () => {
    axios.post.mockRejectedValueOnce(new Error("DB connection failed"));
    render(<ProfilePage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Movie Alpha")).toBeInTheDocument();
    });

    const removeButton = screen
      .getByText("Movie Alpha")
      .closest("div")
      .querySelector("button");
    await user.click(removeButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to remove movie. Please try again."
      );
    });

    expect(screen.getByText("Movie Alpha")).toBeInTheDocument();
  });
});
