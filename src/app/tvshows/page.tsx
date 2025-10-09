"use client";

import React, { useState, FormEvent, useEffect } from "react";
import axios, { AxiosError } from "axios";
import Navbar from "@/app/components/nav";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

//INTERFACE
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
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) {
      toast.error("Please enter a show name to search.", {
        position: "top-center",
      });
      return;
    }

    router.push(`?q=${encodeURIComponent(inputValue.trim())}`);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-white text-xl text-center p-8">
          Loading search results...
        </div>
      );
    }

    if (shows.length > 0) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {shows.map((item) => (
            <Link
              key={item.id}
              href={`/info/tv/${item.id}`}
              className="searchlink bg-gray-800 rounded-lg shadow-lg hover:shadow-blue-500/50 transition-shadow duration-300 overflow-hidden group block"
            >
              <div className="eachitem">
                <div className="relative w-full h-auto aspect-[2/3]">
                  {item.poster_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                      alt={item.name}
                      className="contentimg"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-700 text-gray-400 text-center p-2">
                      No Poster Available
                    </div>
                  )}
                </div>
                <div className="p-3 text-center">
                  <h3 className="text-lg font-semibold text-white truncate">
                    {item.name}
                  </h3>
                  <div className="text-sm font-bold text-yellow-400 mt-1">
                    ⭐ {item.vote_average.toFixed(1)} / 10
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      );
    }

    if (hasSearched) {
      return (
        <p className="default text-white text-xl text-center p-8">
          No results found for &quot;{currentSearchTerm}&quot;. Try again or try
          searching movies.
        </p>
      );
    }

    return (
      <p className="default text-white text-xl text-center p-8">
        Try searching for a TV Show!
      </p>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 font-sans">
      <Navbar />
      <section className="content max-w-7xl mx-auto p-4 sm:p-6">
        <form onSubmit={handleSearch} className="searchbar mb-12">
          <h1 className="profileh1 text-4xl font-extrabold text-blue-400 mb-6 text-center">
            TV Show Search
          </h1>
          <div className="flex max-w-2xl mx-auto shadow-xl rounded-xl overflow-hidden">
            <input
              type="text"
              placeholder="Enter a show name (e.g., The Last of Us)"
              name="inputs"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="searchinput flex-grow px-5 py-3 text-lg text-white bg-gray-800 border-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              className="searchbutton px-6 py-3 bg-blue-600 text-white font-semibold text-lg hover:bg-blue-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        <div className="listofcontent">{renderContent()}</div>
      </section>
    </div>
  );
}
