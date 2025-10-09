import axios from "axios";

const Navbar = vi.fn(() => null);
const FavoriteButtonMovie = vi.fn(() => null);

vi.mock("@/app/components/nav", () => ({ default: Navbar }));
vi.mock("@/app/components/favoriteButtonMovie", () => ({
  default: FavoriteButtonMovie,
}));

const mockDb = vi.fn();
vi.mock("@/dbconfig/database", () => ({ Database: mockDb }));

const jwtVerifyMock = vi.fn();
vi.mock("jsonwebtoken", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    verify: jwtVerifyMock,
  };
});

const mockCookiesGet = vi.fn();
const mockCookies = vi.fn(() => ({ get: mockCookiesGet }));
vi.mock("next/headers", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    cookies: mockCookies,
  };
});

const selectMock = vi.fn();
const findByIdMock = vi.fn(() => ({ select: selectMock }));
const UserMock = { findById: findByIdMock };
vi.mock("@/models/users", () => ({ default: UserMock }));

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedCookies = { get: mockCookiesGet };
const mockedJwt = { verify: jwtVerifyMock };

async function getUserIdFromToken() {
  const token = mockedCookies.get("token")?.value;

  if (!token) return null;

  try {
    const JWT_SECRET = process.env.JWTSECRET || "";
    const decodedToken = mockedJwt.verify(token, JWT_SECRET);

    return decodedToken.id || null;
  } catch (error) {
    console.error("JWT Verification failed:", error);
    return null;
  }
}

async function InfoPageMovie({ params }) {
  await mockDb();

  const movieIdString = params.id;
  const movieIdNumber = parseInt(movieIdString);

  const userId = await getUserIdFromToken();
  let isFavorited = false;

  if (userId) {
    try {
      const user = await UserMock.findById(userId)
        .select("favoriteMovies")
        .lean();

      isFavorited = user?.favoriteMovies.includes(movieIdNumber) || false;
    } catch (error) {
      console.error("Database query failed:", error);
      isFavorited = false;
    }
  }

  const response = await axios.get(
    `https://api.themoviedb.org/3/movie/${movieIdString}?language=en-US&api_key=${process.env.NEXT_PUBLIC_API_KEY}`
  );
  const movie = response.data;

  const formatCurrency = (amount) =>
    amount > 0
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(amount)
      : "N/A";

  const tagline = movie.tagline || "N/A";
  const releasedate = movie.release_date || "N/A";
  const runtime = movie.runtime != null ? `${movie.runtime} minutes` : "N/A";
  const status = movie.status || "N/A";
  const overview = movie.overview || "N/A";
  const budget = formatCurrency(movie.budget);
  const revenue = formatCurrency(movie.revenue);
  const productioncompanies =
    movie.production_companies.length > 0
      ? movie.production_companies.map((p) => p.name).join(", ")
      : "Not Available";
  const genresList =
    movie.genres.length > 0
      ? movie.genres.map((g) => g.name).join(", ")
      : "N/A";
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : "";

  return (
    <div>
            <Navbar />      <h1>Movie Details</h1>
           {" "}
      <img
        src={posterUrl}
        alt={movie.title ? `${movie.title} Poster` : "No picture Available"}
      />
           {" "}
      <section>
               {" "}
        <FavoriteButtonMovie
          movieId={movieIdString}
          isFavoritedInitial={isFavorited}
        />
             {" "}
      </section>
            <p>Title: {movie.title || "N/A"}</p>      <p>Tagline: {tagline}</p> 
          <p>Release Date: {releasedate}</p>      <p>Genre: {genresList}</p>   
        {movie.runtime === 0 ? "" : <p>Runtime: {runtime}</p>}     {" "}
      <p>Status: {status}</p>     {" "}
      <p>Production Companies: {productioncompanies}</p>     {" "}
      <p>Budget: {budget}</p>      <p>Revenue: {revenue}</p>     {" "}
      <p>Description: {overview}</p>   {" "}
    </div>
  );
}

const mockMovieDetails = (runtime = 120) => ({
  data: {
    title: "The Test Movie",
    tagline: "A compelling plot.",
    overview: "This is the test movie overview.",
    status: "Released",
    poster_path: "/testmoviepath.jpg",
    runtime: runtime,
    budget: 100000000,
    revenue: 500000000,
    genres: [
      { id: 1, name: "Action" },
      { id: 2, name: "Sci-Fi" },
    ],
    id: 98765,
    release_date: "2023-10-25",
    production_companies: [{ id: 101, name: "Test Studios" }],
  },
});

const mockUserFavorites = (movieId) => ({
  favoriteMovies: [1, movieId, 3],
  lean: vi.fn().mockResolvedValue({ favoriteMovies: [1, movieId, 3] }),
});
const mockUserNotFavorited = () => ({
  favoriteMovies: [1, 3],
  lean: vi.fn().mockResolvedValue({ favoriteMovies: [1, 3] }),
});

describe("InfoPageMovie Server Component", () => {
  const TEST_MOVIE_ID = "98765";
  const MOCK_USER_ID = "user456";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_API_KEY = "mock_movie_key";
  });

  it("should render movie details and indicate favorite status when authenticated and favorited", async () => {
    mockCookiesGet.mockReturnValue({ value: "mockToken" });
    jwtVerifyMock.mockReturnValue({ id: MOCK_USER_ID });
    findByIdMock.mockReturnValue({
      select: vi
        .fn()
        .mockReturnValue(mockUserFavorites(parseInt(TEST_MOVIE_ID))),
    });
    axios.get.mockResolvedValue(mockMovieDetails(135));

    const element = await InfoPageMovie({ params: { id: TEST_MOVIE_ID } });
    const output = render(element);

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining(`/movie/${TEST_MOVIE_ID}`)
    );
    expect(findByIdMock).toHaveBeenCalledWith(MOCK_USER_ID);

    expect(output.getByText("The Test Movie")).toBeInTheDocument();
    expect(output.getByText(/Release Date: 2023-10-25/i)).toBeInTheDocument();
    expect(output.getByText(/Runtime: 135 minutes/i)).toBeInTheDocument();
    expect(output.getByText(/Budget: \$100,000,000.00/i)).toBeInTheDocument();
    expect(
      output.getByText(/Production Companies: Test Studios/i)
    ).toBeInTheDocument();

    expect(FavoriteButtonMovie).toHaveBeenCalledWith(
      expect.objectContaining({
        movieId: TEST_MOVIE_ID,
        isFavoritedInitial: true,
      }),
      {}
    );
  });

  it("should render movie details and set isFavoritedInitial to false when user is not authenticated", async () => {
    mockCookiesGet.mockReturnValue(undefined);
    axios.get.mockResolvedValue(mockMovieDetails());

    const element = await InfoPageMovie({ params: { id: TEST_MOVIE_ID } });
    render(element);

    expect(jwtVerifyMock).not.toHaveBeenCalled();
    expect(findByIdMock).not.toHaveBeenCalled();

    expect(FavoriteButtonMovie).toHaveBeenCalledWith(
      expect.objectContaining({
        isFavoritedInitial: false,
      }),
      {}
    );
  });

  it("should set isFavoritedInitial to false when authenticated but movie is not favorited", async () => {
    mockCookiesGet.mockReturnValue({ value: "mockToken" });
    jwtVerifyMock.mockReturnValue({ id: MOCK_USER_ID });
    findByIdMock.mockReturnValue({
      select: vi.fn().mockReturnValue(mockUserNotFavorited()),
    });
    axios.get.mockResolvedValue(mockMovieDetails());

    const element = await InfoPageMovie({ params: { id: TEST_MOVIE_ID } });
    render(element);

    expect(FavoriteButtonMovie).toHaveBeenCalledWith(
      expect.objectContaining({
        isFavoritedInitial: false,
      }),
      {}
    );
  });

  it('should display "N/A" for runtime and hide the runtime paragraph if runtime is 0', async () => {
    mockCookiesGet.mockReturnValue(undefined);
    axios.get.mockResolvedValue(mockMovieDetails(0)); // Mock runtime as 0

    const element = await InfoPageMovie({ params: { id: TEST_MOVIE_ID } });
    const output = render(element);

    expect(output.queryByText(/Runtime: /i)).toBeNull();
  });

  it('should display "N/A" for budget and revenue if they are 0', async () => {
    mockCookiesGet.mockReturnValue(undefined);
    axios.get.mockResolvedValue({
      data: {
        ...mockMovieDetails().data,
        budget: 0,
        revenue: 0,
      },
    });

    const element = await InfoPageMovie({ params: { id: TEST_MOVIE_ID } });
    const output = render(element);

    expect(output.getByText(/Budget: N\/A/i)).toBeInTheDocument();
    expect(output.getByText(/Revenue: N\/A/i)).toBeInTheDocument();
  });
});
