import React, { useState, FormEvent } from "react";
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

function Tvsearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [shows, setShows] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm) {
      alert("Please enter a show name.");
      return;
    }

    setHasSearched(true);
    try {
      const response = await axios.get(
        `https://api.themoviedb.org/3/search/tv?include_adult=false&language=en-US&page=1&api_key=${process.env.NEXT_PUBLIC_API_KEY}&query=${searchTerm}`
      );
      setShows(response.data.results);
    } catch (error) {
      console.error("Error fetching data:", error);
      setShows([]);
    }
  };

  return (
    <div>
      <Navbar />
      <h1>TV Show Search</h1>
      <form onSubmit={handleSearch} id="main">
        <input
          type="text"
          placeholder="Enter a show"
          name="inputs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      <div className="list">
        {shows.length > 0 ? (
          shows.map((item) => (
            <Link
              key={item.id}
              href={`/info/${item.id}`}
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
                    alt={item.name}
                    style={{
                      display: "block",
                      maxWidth: "100%",
                      height: "auto",
                    }}
                  />
                ) : (
                  <p>No Image Available</p>
                )}

                <h3>{item.name}</h3>
              </div>
            </Link>
          ))
        ) : hasSearched ? (
          <p>Show not available try again or try searching movies</p>
        ) : (
          <p>Try searching for a Show!</p>
        )}
      </div>
    </div>
  );
}

const mockShows = [
  {
    id: 101,
    name: "The Office",
    poster_path: "/poster1.jpg",
    overview: "A comedy.",
    vote_average: 9.0,
  },
  {
    id: 102,
    name: "Parks and Recreation",
    poster_path: null,
    overview: "Another comedy.",
    vote_average: 8.5,
  },
];

const mockTmdbResponse = {
  data: {
    page: 1,
    results: mockShows,
    total_pages: 1,
    total_results: 2,
  },
};

describe("Tvsearch", () => {
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
    render(<Tvsearch />);
    expect(screen.getByText("Try searching for a Show!")).toBeInTheDocument();
  });

  it("should call alert when search is submitted with empty term", async () => {
    const user = userEvent.setup();
    render(<Tvsearch />);
    await user.click(screen.getByRole("button", { name: /Search/i }));
    expect(alertSpy).toHaveBeenCalledWith("Please enter a show name.");
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("should successfully fetch and display search results", async () => {
    axios.get.mockResolvedValue(mockTmdbResponse);
    const user = userEvent.setup();
    render(<Tvsearch />);

    await user.type(screen.getByPlaceholderText(/Enter a show/i), "comedy");
    await user.click(screen.getByRole("button", { name: /Search/i }));

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("query=comedy")
      );
    });

    expect(screen.getByText("The Office")).toBeInTheDocument();
    expect(screen.getByText("Parks and Recreation")).toBeInTheDocument();
    expect(
      screen.queryByText("Try searching for a Show!")
    ).not.toBeInTheDocument();

    const officeLink = screen.getByText("The Office").closest("a");
    expect(officeLink).toHaveAttribute("href", "/info/101");
    expect(screen.getByAltText("The Office")).toHaveAttribute(
      "src",
      "https://image.tmdb.org/t/p/w500/poster1.jpg"
    );
    expect(screen.getByText("Parks and Recreation"))
      .closest("a")
      .toHaveAttribute("href", "/info/102");
    expect(
      screen.getByText("Parks and Recreation").closest("div").querySelector("p")
    ).toHaveTextContent("No Image Available");
  });

  it("should display no results message when search returns empty array", async () => {
    axios.get.mockResolvedValue({ data: { results: [] } });
    const user = userEvent.setup();
    render(<Tvsearch />);

    await user.type(screen.getByPlaceholderText(/Enter a show/i), "nonsense");
    await user.click(screen.getByRole("button", { name: /Search/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Show not available try again or try searching movies")
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("The Office")).not.toBeInTheDocument();
  });

  it("should display no results message on API error", async () => {
    axios.get.mockRejectedValue(new Error("Network failure"));
    const user = userEvent.setup();
    render(<Tvsearch />);

    await user.type(screen.getByPlaceholderText(/Enter a show/i), "error");
    await user.click(screen.getByRole("button", { name: /Search/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Show not available try again or try searching movies")
      ).toBeInTheDocument();
    });
  });
});
