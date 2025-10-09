import axios from "axios";
import Navbar from "@/app/components/nav";
import FavoriteButtonMovie from "@/app/components/favoriteButtonMovie";
import { cookies } from "next/headers";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Database } from "@/dbconfig/database";
import User from "@/models/users";
import Backbutton from "@/app/components/backbutton";

interface InfoPageProps {
  params: {
    id: string;
  };
}

interface MovieDetails {
  title: string;
  tagline: string | null;
  overview: string | null;
  status: string;
  poster_path: string | null;
  runtime: number | null;
  budget: number;
  revenue: number;
  genres: Array<{ id: number; name: string }>;
  id: number;
  release_date: string;
  production_companies: Array<{
    id: number;
    logo_path: string;
    name: string;
    origin_country: string;
  }>;
}

interface CustomJwtPayload extends JwtPayload {
  id: string;
}

async function getUserIdFromToken(): Promise<string | null> {
  const cookieStore = cookies();

  const token: string | undefined = (await cookieStore).get("token")?.value;

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

export default async function InfoPageMovie({ params }: InfoPageProps) {
  await Database();

  const movieIdString: string = params.id;
  const movieIdNumber: number = parseInt(movieIdString);

  const userId: string | null = await getUserIdFromToken();
  let isFavorited: boolean = false;

  if (userId) {
    try {
      const user: { favoriteMovies: number[] } | null = (await User.findById(
        userId
      )
        .select("favoriteMovies")
        .lean()) as { favoriteMovies: number[] } | null;

      isFavorited = user?.favoriteMovies.includes(movieIdNumber) || false;
    } catch (error) {
      console.error("Database query failed:", error);
      isFavorited = false;
    }
  }

  const response = await axios.get<MovieDetails>(
    `https://api.themoviedb.org/3/movie/${movieIdString}?language=en-US&api_key=${process.env.NEXT_PUBLIC_API_KEY}`
  );
  const movie: MovieDetails = response.data;

  const formatCurrency = (amount: number): string =>
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
  const posterUrl: string = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : "";

  return (
    <div>
      <Navbar />
      <div className="content">
        <Backbutton />
        <section className="h1wrap">
          <h1 className="profileh1">Movie Details</h1>
          <img
            src={posterUrl || undefined}
            alt={movie.title ? `${movie.title} Poster` : "No picture Available"}
            className="idimg"
          />
          <FavoriteButtonMovie
            movieId={movieIdString}
            isFavoritedInitial={isFavorited}
          />
        </section>
        <section className="iteminfo">
          <h2>{movie.title || "N/A"}</h2>

          <p>
            <strong>Tagline:</strong> {tagline}
          </p>
          <p>
            <strong>Release Date:</strong> {releasedate}
          </p>
          <p>
            <strong>Genre:</strong> {genresList}
          </p>
          {movie.runtime === 0 ? (
            ""
          ) : (
            <p>
              <strong>Runtime:</strong> {runtime}
            </p>
          )}
          <p>
            <strong>Status:</strong> {status}
          </p>
          <p>
            <strong>Production Companies:</strong> {productioncompanies}
          </p>
          <p>
            <strong>Budget:</strong> {budget}
          </p>
          <p>
            <strong>Revenue:</strong> {revenue}
          </p>
          <p>
            <strong>Description: </strong>
            {overview}
          </p>
        </section>
      </div>
    </div>
  );
}
