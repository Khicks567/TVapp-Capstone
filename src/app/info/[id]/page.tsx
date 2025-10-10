import axios from "axios";
import Navbar from "@/app/components/nav";
import FavoriteButton from "@/app/components/favoriteButtonTvShow";
import { cookies } from "next/headers";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Database } from "@/dbconfig/database";
import User from "@/models/users";
import Notificationbutton from "@/helpers/notificationsbutton";
import Backbutton from "@/app/components/backbutton";

// interface
interface InfoPageProps {
  params: {
    id: string;
  };
}

interface FavoriteTvUserDoc {
  favoriteTvShows: number[];
}
interface CustomJwtPayload extends JwtPayload {
  id: string;
}

interface Creator {
  name: string;
  id: number;
  credit_id: string;
  original_name: string;
  gender: number;
  profile_path: string | null;
}
interface EpisodeDetails {
  name: string;
  air_date: string;
  episode_number: number;
  season_number: number;
}
interface Network {
  name: string;
  id: number;
  logo_path: string;
  origin_country: string;
}
interface TVShowDetails {
  name: string;
  tagline: string;
  overview: string;
  genres: Array<{ name: string; id: number }>;
  first_air_date: string;
  last_air_date: string;
  number_of_seasons: number;
  number_of_episodes: number;
  networks: Network[];
  next_episode_to_air: EpisodeDetails | null;
  created_by: Creator[];
  status: string;
  poster_path: string;
}

async function getUserIdFromToken(): Promise<string | null> {
  const token: string | undefined = (await cookies()).get("token")?.value;
  if (!token) return null;

  try {
    const JWT_SECRET = process.env.JWTSECRET || "";
    const decodedToken = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
    return decodedToken.id || null;
  } catch (error) {
    console.error("JWT Verification failed:", error);
    return null;
  }
}

export default async function InfoPage({ params }: InfoPageProps) {
  await Database();

  const showIdString: string = params.id;
  const showIdNumber: number = parseInt(showIdString);

  const userId: string | null = await getUserIdFromToken();
  let isFavorited: boolean = false;

  if (userId) {
    try {
      const user = (await User.findById(userId)
        .select("favoriteTvShows")
        .lean()) as FavoriteTvUserDoc | null;

      isFavorited = user?.favoriteTvShows.includes(showIdNumber) || false;
    } catch (error) {
      console.error("Database query failed:", error);
      isFavorited = false;
    }
  }

  const response = await axios.get<TVShowDetails>(
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
  const posterUrl: string = show.poster_path
    ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
    : "";

  const nextEpisodeInfo = show.next_episode_to_air
    ? `${show.next_episode_to_air.name} (Air Date: ${
        show.next_episode_to_air.air_date || "TBD"
      })`
    : "No upcoming episode scheduled.";

  return (
    <div>
      <Navbar />

      <div className="content">
        <Backbutton />
        <section className="h1wrap">
          <h1 className="profileh1">Show Details</h1>

          {posterUrl ? (
            <div className="idimg-container">
              <img
                src={posterUrl}
                alt={show.name ? `${show.name} Poster` : "No picture Available"}
                className="idimg"
              />
            </div>
          ) : (
            <div className="idimg-placeholder">No picture Available</div>
          )}

          <section>
            <FavoriteButton
              showId={showIdString}
              isFavoritedInitial={isFavorited}
            />
          </section>
          {show.status === "Canceled" ||
          nextEpisodeInfo === "No upcoming episode scheduled." ? (
            ""
          ) : (
            <Notificationbutton showIdNumber={showIdNumber} />
          )}
        </section>

        <h2>{show.name || "N/A"}</h2>
        <section className="iteminfo">
          <p>
            <strong>Tagline:</strong> {tagline}
          </p>
          <p>
            <strong>Genre:</strong> {genresList}
          </p>
          <p>
            <strong>First Episode:</strong> {firstAirDate}
          </p>
          <p>
            <strong>Last Episode:</strong> {lastAirDate}
          </p>
          <p>
            <strong>Number of Seasons:</strong>
            {show.number_of_seasons != null ? show.number_of_seasons : "N/A"}
          </p>
          <p>
            <strong>Number of Episodes:</strong>
            {show.number_of_episodes != null ? show.number_of_episodes : "N/A"}
          </p>
          <p>
            <strong>Network:</strong> {networkName}
          </p>
          {show.status === "Canceled" ? (
            <p>
              <strong>Show has been Canceled</strong>
            </p>
          ) : (
            <p>
              <strong>Next episode:</strong> {nextEpisodeInfo}
            </p>
          )}
          <p>
            <strong>Created by:</strong> {createdByList}
          </p>
          <p>
            <strong>Description:</strong> {overview}
          </p>
        </section>
      </div>
    </div>
  );
}
