import axios from "axios";

const Navbar = vi.fn(() => null);
const FavoriteButton = vi.fn(() => null);
const Notificationbutton = vi.fn(() => null);

vi.mock("@/app/components/nav", () => ({ default: Navbar }));
vi.mock("@/app/components/favoriteButtonTvShow", () => ({
  default: FavoriteButton,
}));
vi.mock("@/helpers/notificationsbutton", () => ({
  default: Notificationbutton,
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

async function InfoPage({ params }) {
  await mockDb();

  const showIdString = params.id;
  const showIdNumber = parseInt(showIdString);
  const userId = await getUserIdFromToken();
  let isFavorited = false;

  if (userId) {
    try {
      const user = await UserMock.findById(userId)
        .select("favoriteTvShows")
        .lean();

      isFavorited = user?.favoriteTvShows.includes(showIdNumber) || false;
    } catch (error) {
      console.error("Database query failed:", error);
      isFavorited = false;
    }
  }

  const response = await axios.get(
    `https://api.themoviedb.org/3/tv/${showIdString}?language=en-US&api_key=${process.env.NEXT_PUBLIC_API_KEY}`
  );

  const show = response.data;

  const tagline = show.tagline || "N/A";
  const firstAirDate = show.first_air_date || "N/A";
  const lastAirDate = show.last_air_date || "N/A";
  const overview = show.overview || "N/A";
  const networkName = show.networks?.[0]?.name || "Unknown Network";
  const genresList =
    show.genres.length > 0 ? show.genres.map((g) => g.name).join(", ") : "N/A";
  const createdByList =
    show.created_by.length > 0
      ? show.created_by.map((creator) => creator.name).join(", ")
      : "N/A";

  const nextEpisodeInfo = show.next_episode_to_air
    ? `${show.next_episode_to_air.name} (Air Date: ${
        show.next_episode_to_air.air_date || "TBD"
      })`
    : "No upcoming episode scheduled.";

  return (
    <div>
      <Navbar /> <h1>Show Details</h1>
      <img
        src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
        alt={show.name ? `${show.name} Poster` : "No picture Available"}
      />
      <section>
        <FavoriteButton
          showId={showIdString}
          isFavoritedInitial={isFavorited}
        />

        {show.status === "Canceled" ||
        nextEpisodeInfo === "No upcoming episode scheduled." ? (
          ""
        ) : (
          <Notificationbutton showIdNumber={showIdNumber} />
        )}
      </section>
      <h2>{show.name || "N/A"}</h2> <p>Tagline: {tagline}</p>
      <p>Genre: {genresList}</p>
      <p>First Episode: {firstAirDate}</p>
      <p>Last Episode: {lastAirDate}</p>
      <p>
        Number of Seasons:
        {show.number_of_seasons != null ? show.number_of_seasons : "N/A"}
      </p>
      <p>
        Number of Episodes:
        {show.number_of_episodes != null ? show.number_of_episodes : "N/A"}
      </p>
      <p>Network: {networkName}</p>
      {show.status === "Canceled" ? (
        <p>
          Show has been <span>Canceled</span>
        </p>
      ) : (
        <p>Next episode: {nextEpisodeInfo} </p>
      )}
      <p>Created by: {createdByList}</p>
      <p>Description: {overview} </p>
    </div>
  );
}

const mockShowDetails = (status, nextEpisodeToAir) => ({
  data: {
    name: "The Test Show",
    tagline: "It works.",
    overview: "This is the test overview.",
    genres: [{ name: "Test" }, { name: "Comedy" }],
    first_air_date: "2022-01-01",
    last_air_date: "2024-01-01",
    number_of_seasons: 2,
    number_of_episodes: 20,
    networks: [{ name: "TestNet" }],
    created_by: [{ name: "Creator One" }, { name: "Creator Two" }],
    poster_path: "/testpath.jpg",
    status: status,
    next_episode_to_air: nextEpisodeToAir,
  },
});

const mockUserFavorites = (showId) => ({
  favoriteTvShows: [100, showId, 999],
  lean: vi.fn().mockResolvedValue({ favoriteTvShows: [100, showId, 999] }),
});
const mockUserNotFavorited = () => ({
  favoriteTvShows: [100, 999],
  lean: vi.fn().mockResolvedValue({ favoriteTvShows: [100, 999] }),
});

describe("InfoPage Server Component", () => {
  const TEST_SHOW_ID = "12345";
  const MOCK_USER_ID = "user123";
  const nextEpisode = { name: "Epi 3", air_date: "2025-01-01" };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_API_KEY = "mock_key";
  });

  it("should render show details, indicate favorite status, and show notification button when authenticated and favorited (standard case)", async () => {
    mockCookiesGet.mockReturnValue({ value: "mockToken" });
    jwtVerifyMock.mockReturnValue({ id: MOCK_USER_ID });
    findByIdMock.mockReturnValue({
      select: vi
        .fn()
        .mockReturnValue(mockUserFavorites(parseInt(TEST_SHOW_ID))),
    });
    axios.get.mockResolvedValue(
      mockShowDetails("Returning Series", nextEpisode)
    );

    const element = await InfoPage({ params: { id: TEST_SHOW_ID } });
    const output = render(element);

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining(`/tv/${TEST_SHOW_ID}`)
    );
    expect(findByIdMock).toHaveBeenCalledWith(MOCK_USER_ID);

    expect(output.getByText("The Test Show")).toBeInTheDocument();
    expect(output.getByText(/Network: TestNet/i)).toBeInTheDocument();
    expect(output.getByText(/Next episode: Epi 3/i)).toBeInTheDocument();

    expect(FavoriteButton).toHaveBeenCalledWith(
      expect.objectContaining({
        showId: TEST_SHOW_ID,
        isFavoritedInitial: true,
      }),
      {}
    );

    expect(Notificationbutton).toHaveBeenCalledWith(
      expect.objectContaining({
        showIdNumber: parseInt(TEST_SHOW_ID),
      }),
      {}
    );
  });

  it("should render show details and set isFavoritedInitial to false when user is not authenticated", async () => {
    mockCookiesGet.mockReturnValue(undefined);
    axios.get.mockResolvedValue(
      mockShowDetails("Returning Series", nextEpisode)
    );

    const element = await InfoPage({ params: { id: TEST_SHOW_ID } });
    const output = render(element);

    expect(jwtVerifyMock).not.toHaveBeenCalled();
    expect(findByIdMock).not.toHaveBeenCalled();

    expect(output.getByText("The Test Show")).toBeInTheDocument();
    expect(FavoriteButton).toHaveBeenCalledWith(
      expect.objectContaining({
        isFavoritedInitial: false,
      }),
      {}
    );
  });

  it("should render show details and set isFavoritedInitial to false when user is authenticated but show is not favorited", async () => {
    mockCookiesGet.mockReturnValue({ value: "mockToken" });
    jwtVerifyMock.mockReturnValue({ id: MOCK_USER_ID });
    findByIdMock.mockReturnValue({
      select: vi.fn().mockReturnValue(mockUserNotFavorited()),
    });
    axios.get.mockResolvedValue(
      mockShowDetails("Returning Series", nextEpisode)
    );

    const element = await InfoPage({ params: { id: TEST_SHOW_ID } });
    render(element);

    expect(FavoriteButton).toHaveBeenCalledWith(
      expect.objectContaining({
        isFavoritedInitial: false,
      }),
      {}
    );
  });

  it('should hide Notificationbutton when show status is "Canceled"', async () => {
    mockCookiesGet.mockReturnValue({ value: "mockToken" });
    jwtVerifyMock.mockReturnValue({ id: MOCK_USER_ID });
    findByIdMock.mockReturnValue({
      select: vi.fn().mockReturnValue(mockUserNotFavorited()),
    });
    axios.get.mockResolvedValue(mockShowDetails("Canceled", nextEpisode));

    const element = await InfoPage({ params: { id: TEST_SHOW_ID } });
    const output = render(element);

    expect(output.getByText(/Show has been Canceled/i)).toBeInTheDocument();
    expect(Notificationbutton).not.toHaveBeenCalled();
  });

  it("should hide Notificationbutton when there is no upcoming episode", async () => {
    mockCookiesGet.mockReturnValue({ value: "mockToken" });
    jwtVerifyMock.mockReturnValue({ id: MOCK_USER_ID });
    findByIdMock.mockReturnValue({
      select: vi.fn().mockReturnValue(mockUserNotFavorited()),
    });
    axios.get.mockResolvedValue(mockShowDetails("Ended", null));

    const element = await InfoPage({ params: { id: TEST_SHOW_ID } });
    const output = render(element);

    expect(
      output.getByText(/No upcoming episode scheduled/i)
    ).toBeInTheDocument();
    expect(Notificationbutton).not.toHaveBeenCalled();
  });
});
