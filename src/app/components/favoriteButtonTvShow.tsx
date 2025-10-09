"use client";

import React, { useState } from "react";
import axios from "axios";

interface FavoriteButtonProps {
  showId: string;
  isFavoritedInitial?: boolean;
}

export default function FavoriteButton({
  showId,
  isFavoritedInitial = false,
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(isFavoritedInitial);
  const [isLoading, setIsLoading] = useState(false);

  const handleFavoriteToggle = async () => {
    if (isFavorited) return;

    setIsLoading(true);
    try {
      const endpoint = "/api/users/addtoFavoritestv";

      const response = await axios.post(endpoint, {
        showId: parseInt(showId),
        type: "tvshow",
      });

      if (response.status === 200) {
        setIsFavorited(true);
      } else {
        console.error("Failed to update favorites:", response.data.error);
      }
    } catch (error) {
      console.error("An error occurred during API call:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className="addto"
      onClick={handleFavoriteToggle}
      disabled={isLoading || isFavorited}
    >
      {isLoading
        ? "Updating..."
        : isFavorited
        ? "⭐ Added to favorites"
        : "Add to favorites"}
    </button>
  );
}
