"use client";

import React, { useState, FormEvent, useEffect } from "react";
import axios from "axios";
import Navbar from "@/app/components/nav";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

//INTERFACE
interface ShowResult {
  id: number;
  name: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
}

export default function Tvsearch() {
  const [inputValue, setInputValue] = useState<string>("");
  const [shows, setShows] = useState<ShowResult[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSearchTerm = searchParams.get("q") || "";

  useEffect(() => {
    if (currentSearchTerm) {
      setInputValue(currentSearchTerm);
      fetchShows(currentSearchTerm);
    }
  }, [currentSearchTerm]);

  const fetchShows = async (query: string) => {
    if (!query) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      interface TmdbTvSearchResponse {
        page: number;
        results: ShowResult[];
        total_pages: number;
        total_results: number;
      }

      const response = await axios.get<TmdbTvSearchResponse>(
        `https://api.themoviedb.org/3/search/tv?include_adult=false&language=en-US&page=1&api_key=${process.env.NEXT_PUBLIC_API_KEY}&query=${query}`
      );
      setShows(response.data.results);
    } catch (error) {
      console.error("Error fetching data:", error);
      setShows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue) {
      alert("Please enter a show name.");
      return;
    }

    router.push(`?q=${encodeURIComponent(inputValue)}`);
  };

  const renderContent = () => {
    if (isLoading) {
      return <p className="default">Loading search results...</p>;
    }

    if (shows.length > 0) {
      return shows.map((item) => (
        <Link key={item.id} href={`/info/${item.id}`} className="searchlink">
          <div className="eachitem">
            {item.poster_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                alt={item.name}
                className="contentimg"
              />
            ) : (
              <p className="default">No Image Available</p>
            )}

            <h3>{item.name}</h3>
          </div>
        </Link>
      ));
    }

    if (hasSearched) {
      return (
        <p className="default">
          Show not available try again or try searching movies
        </p>
      );
    }

    return <p className="default">Try searching for a Show!</p>;
  };

  return (
    <div>
      <Navbar />
      <section className="content">
        <form onSubmit={handleSearch} className="searchbar">
          <h1 className="profileh1">TV Show Search</h1>
          <input
            type="text"
            placeholder="Enter a show"
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
