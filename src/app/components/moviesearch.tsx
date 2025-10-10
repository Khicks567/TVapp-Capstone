"use client";

import React, { useState, FormEvent, useEffect, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

// INTERFACE
interface MovieResult {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
}

export function MovieSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSearchTerm = searchParams.get("q") || "";

  const [inputValue, setInputValue] = useState<string>(currentSearchTerm);
  const [movies, setMovies] = useState<MovieResult[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(!!currentSearchTerm);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchMovies = useCallback(async (query: string) => {
    if (!query) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      interface TmdbMovieResponse {
        page: number;
        results: MovieResult[];
        total_pages: number;
        total_results: number;
      }

      const apiKey = process.env.NEXT_PUBLIC_API_KEY;
      if (!apiKey) {
        throw new Error("TMDB API key is missing.");
      }

      const response = await axios.get<TmdbMovieResponse>(
        `https://api.themoviedb.org/3/search/movie?include_adult=false&language=en-US&page=1&api_key=${apiKey}&query=${query}`
      );
      setMovies(
        response.data.results.filter((item) => item.poster_path !== null)
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch movies.");
      setMovies([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentSearchTerm) {
      setInputValue(currentSearchTerm);
      fetchMovies(currentSearchTerm);
    } else {
      setMovies([]);
      setInputValue("");
      setHasSearched(false);
    }
  }, [currentSearchTerm, fetchMovies]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const query = inputValue.trim();

    if (!query) {
      toast.error("Please enter a Movie name.");
      return;
    }

    router.push(`?q=${encodeURIComponent(query)}`);
  };

  const renderContent = () => {
    if (isLoading) {
      return <p className="default">Loading search results...</p>;
    }

    if (movies.length > 0) {
      return movies.map((item) => (
        <Link
          className="searchlink"
          key={item.id}
          href={`/info/movie/${item.id}`}
        >
          <div className="eachitem">
            {item.poster_path ? (
              <div>
                <img
                  src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                  alt={item.title}
                  className="contentimg"
                  width={150}
                  height={225}
                />
              </div>
            ) : (
              <p className="default">No Image Available</p>
            )}

            <h3>{item.title}</h3>
          </div>
        </Link>
      ));
    }

    if (hasSearched) {
      return (
        <p className="default">
          Movie not available try again or try searching Shows
        </p>
      );
    }

    return <p className="default">Try searching for a Movie!</p>;
  };

  return (
    <section className="content">
      <form onSubmit={handleSearch} className="searchbar">
        <h1 className="profileh1">Movie Search</h1>
        <input
          type="text"
          placeholder="Enter a Movie"
          name="inputs"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="searchinput"
        />
        <button className="searchbutton" type="submit" disabled={isLoading}>
          Search
        </button>
      </form>

      <div className="listofcontent">{renderContent()}</div>
    </section>
  );
}
