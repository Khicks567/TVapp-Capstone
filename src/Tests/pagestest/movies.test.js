import React, { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";

const Navbar = vi.fn(() => null);
const Link = ({ children, href }) => <a href={href}>{children}</a>;

vi.mock("@/app/components/nav", () => ({ default: Navbar }));
vi.mock("next/link", () => ({ default: Link }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("axios");

function Moviesearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [movies, setMovies] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm) {
      alert("Please enter a Movie name.");
      return;
    }

    setHasSearched(true);
    try {
      const response = await axios.get(
        ` https://api.themoviedb.org/3/search/movie?include_adult=false&language=en-US&page=1&api_key=${process.env.NEXT_PUBLIC_API_KEY}&query=${searchTerm}`
      );
      setMovies(response.data.results);
      console.log("Search Results:", response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      setMovies([]);
    }
  };

  return (
    <div>
      <Navbar />
      <h1>Movie Search</h1>
      <form onSubmit={handleSearch} id="main">
        <input
          type="text"
          placeholder="Enter a Movie"
          name="inputs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      <div className="list">
        {movies.length > 0 ? (
          movies.map((item) => (
            <Link
              key={item.id}
              href={`/info/movie/${item.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  border: "1px solid #ccc",
                  margin: "10px",
                  padding: "10px",
                  cursor: "pointer",
                }}
              >
                {item.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                    alt={item.title}
                    style={{
                      display: "block",
                      maxWidth: "100%",
                      height: "auto",
                    }}
                  />
                ) : (
                  <p>No Image Available</p>
                )}

                <h3>{item.title}</h3>
              </div>
            </Link>
          ))
        ) : hasSearched ? (
          <p>Movie not available try again or try searching Shows</p>
        ) : (
          <p>Try searching for a Movie!</p>
        )}
      </div>
    </div>
  );
}

const mockMovies = [
  {
    id: 201,
    title: "Inception",
    poster_path: "/posterA.jpg",
    overview: "Dream heist.",
    vote_average: 8.8,
  },
  {
    id: 202,
    title: "Pulp Fiction",
    poster_path: null,
    overview: "Intertwining stories.",
    vote_average: 8.9,
  },
];

const mockTmdbResponse = {
  data: {
    page: 1,
    results: mockMovies,
    total_pages: 1,
    total_results: 2,
  },
};

describe("Moviesearch", () => {
  let alertSpy;
  beforeAll(() => {
    process.env.NEXT_PUBLIC_API_KEY = "mock-api-key";
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterAll(() => {
    alertSpy.mockRestore();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockClear();
  });

  it("should display initial message", () => {
    render(<Moviesearch />);
    expect(screen.getByText("Try searching for a Movie!")).toBeInTheDocument();
  });

  it("should call alert when search is submitted with empty term", async () => {
    const user = userEvent.setup();
    render(<Moviesearch />);
    await user.click(screen.getByRole("button", { name: /Search/i }));
    expect(alertSpy).toHaveBeenCalledWith("Please enter a Movie name.");
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("should successfully fetch and display search results", async () => {
    axios.get.mockResolvedValue(mockTmdbResponse);
    const user = userEvent.setup();
    render(<Moviesearch />);

    await user.type(screen.getByPlaceholderText(/Enter a Movie/i), "action");
    await user.click(screen.getByRole("button", { name: /Search/i }));

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("query=action")
      );
    });

    expect(screen.getByText("Inception")).toBeInTheDocument();
    expect(screen.getByText("Pulp Fiction")).toBeInTheDocument();
    expect(
      screen.queryByText("Try searching for a Movie!")
    ).not.toBeInTheDocument();

    const inceptionLink = screen.getByText("Inception").closest("a");
    expect(inceptionLink).toHaveAttribute("href", "/info/movie/201");
    expect(screen.getByAltText("Inception")).toHaveAttribute(
      "src",
      "https://image.tmdb.org/t/p/w500/posterA.jpg"
    );

    expect(screen.getByText("Pulp Fiction").closest("a")).toHaveAttribute(
      "href",
      "/info/movie/202"
    );
    expect(
      screen.getByText("Pulp Fiction").closest("div").querySelector("p")
    ).toHaveTextContent("No Image Available");
  });

  it("should display no results message when search returns empty array", async () => {
    axios.get.mockResolvedValue({ data: { results: [] } });
    const user = userEvent.setup();
    render(<Moviesearch />);

    await user.type(screen.getByPlaceholderText(/Enter a Movie/i), "none");
    await user.click(screen.getByRole("button", { name: /Search/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Movie not available try again or try searching Shows")
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Inception")).not.toBeInTheDocument();
  });

  it("should display no results message on API error", async () => {
    axios.get.mockRejectedValue(new Error("API failed"));
    const user = userEvent.setup();
    render(<Moviesearch />);

    await user.type(screen.getByPlaceholderText(/Enter a Movie/i), "error");
    await user.click(screen.getByRole("button", { name: /Search/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Movie not available try again or try searching Shows")
      ).toBeInTheDocument();
    });
  });
});
