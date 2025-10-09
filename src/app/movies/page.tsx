"use client";

import React, { useState, FormEvent, useEffect } from "react";
import axios from "axios";
import Navbar from "@/app/components/nav";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

//INTERFACE
interface MovieResult {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
}

export default function Moviesearch() {
  const [inputValue, setInputValue] = useState<string>("");

  const [movies, setMovies] = useState<MovieResult[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSearchTerm = searchParams.get("q") || "";

  const fetchMovies = async (query: string) => {
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

      const response = await axios.get<TmdbMovieResponse>(
        `https://api.themoviedb.org/3/search/movie?include_adult=false&language=en-US&page=1&api_key=${process.env.NEXT_PUBLIC_API_KEY}&query=${query}`
      );
      setMovies(response.data.results);
    } catch (error) {
      console.error("Error fetching data:", error);
      setMovies([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentSearchTerm) {
      setInputValue(currentSearchTerm);
      fetchMovies(currentSearchTerm);
    } else {
      setMovies([]);
      setInputValue("");
      setHasSearched(false);
    }
  }, [currentSearchTerm]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue) {
      alert("Please enter a Movie name.");
      return;
    }

    router.push(`?q=${encodeURIComponent(inputValue)}`);
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
              <img
                src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                alt={item.title}
                className="contentimg"
              />
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
    <div>
      <Navbar />
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
    </div>
  );
}
