"use client"; // This is a Client Component

import React, { useState, FormEvent, useEffect, useCallback } from "react";
import axios, { AxiosError } from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

// INTERFACE
interface ShowResult {
  id: number;
  name: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
}

interface TmdbTvSearchResponse {
  page: number;
  results: ShowResult[];
  total_pages: number;
  total_results: number;
}

export default function TvSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearchTerm = searchParams.get("q") || "";

  const [inputValue, setInputValue] = useState<string>(currentSearchTerm);
  const [shows, setShows] = useState<ShowResult[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(!!currentSearchTerm);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchShows = useCallback(async (query: string) => {
    if (!query) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const TMDB_API_KEY = process.env.NEXT_PUBLIC_API_KEY;
      if (!TMDB_API_KEY) {
        throw new Error("TMDB API key is missing.");
      }

      const response = await axios.get<TmdbTvSearchResponse>(
        `https://api.themoviedb.org/3/search/tv?include_adult=false&language=en-US&page=1&api_key=${TMDB_API_KEY}&query=${query}`
      );
      setShows(
        response.data.results.filter((item) => item.poster_path !== null)
      );
    } catch (error) {
      let errorMessage = "Error fetching data.";
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        errorMessage =
          axiosError.response?.status === 401
            ? "API key is invalid or unauthorized."
            : axiosError.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error("Error fetching data:", errorMessage);
      toast.error(`Search failed: ${errorMessage}`);
      setShows([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentSearchTerm) {
      setInputValue(currentSearchTerm);
      fetchShows(currentSearchTerm);
    } else {
      setShows([]);
      setHasSearched(false);
    }
  }, [currentSearchTerm, fetchShows]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const query = inputValue.trim();

    if (!query) {
      toast.error("Please enter a show name to search.", {
        position: "top-center",
      });
      return;
    }

    router.push(`?q=${encodeURIComponent(query)}`);
  };

  const renderContent = () => {
    if (isLoading) {
      return <div>Loading search results...</div>;
    }

    if (shows.length > 0) {
      return shows.map((item) => (
        <Link key={item.id} href={`/info/${item.id}`} className="searchlink">
          <div className="eachitem">
            {item.poster_path ? (
              <div>
                <img
                  src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                  alt={item.name}
                  className="contentimg"
                  width={150}
                  height={225}
                />
              </div>
            ) : (
              <div>No Poster Available</div>
            )}
            <div>
              <h3>{item.name}</h3>
            </div>
          </div>
        </Link>
      ));
    }

    if (hasSearched) {
      return (
        <p className="default">
          No results found try again or try searching movies.
        </p>
      );
    }

    return <p className="default">Try searching for a TV Show!</p>;
  };

  return (
    <section className="content ">
      <form onSubmit={handleSearch} className="searchbar">
        <h1 className="profileh1">TV Show Search</h1>

        <input
          type="text"
          placeholder="Enter a show name "
          name="inputs"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="searchinput"
        />
        <button className="searchbutton" type="submit" disabled={isLoading}>
          {isLoading ? "Searching..." : "Search"}
        </button>
      </form>
      <div className="listofcontent">{renderContent()}</div>
    </section>
  );
}
