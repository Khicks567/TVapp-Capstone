import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { describe, it, expect, vi, beforeEach } from "vitest";

import "@testing-library/jest-dom";
import axios from "axios";

import FavoriteButtonMovie from "@/app/components/favoriteButtonMovie";

vi.mock("axios");

const mockedAxios = axios;

const testMovieId = "12345";
const successResponse = { status: 200, data: {} };

describe("FavoriteButtonMovie", () => {
  beforeEach(() => {
    mockedAxios.post.mockClear();
  });

  // TEST 1

  it('renders "Add to favorites" initially and is enabled', () => {
    render(
      <FavoriteButtonMovie movieId={testMovieId} isFavoritedInitial={false} />
    );

    const button = screen.getByRole("button", { name: /Add to favorites/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  // TEST 2

  it('renders "⭐ Added to favorites" and is disabled when initially true', () => {
    render(
      <FavoriteButtonMovie movieId={testMovieId} isFavoritedInitial={true} />
    );

    const button = screen.getByRole("button", { name: /Added to favorites/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  // TEST 3

  it("sends POST request and updates to favorited state on successful click", async () => {
    mockedAxios.post.mockResolvedValue(successResponse);

    render(<FavoriteButtonMovie movieId={testMovieId} />);
    const initialButton = screen.getByRole("button", {
      name: /Add to favorites/i,
    });

    fireEvent.click(initialButton);

    expect(screen.getByRole("button", { name: /Updating.../i })).toBeDisabled();

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/api/users/addtoFavoritemovie",
        {
          movieId: 12345,
          type: "movie",
        }
      );

      const favoritedButton = screen.getByRole("button", {
        name: /Added to favorites/i,
      });
      expect(favoritedButton).toBeInTheDocument();
      expect(favoritedButton).toBeDisabled();
    });
  });

  // TEST 4

  it("reverts to initial state and enables button when the API call fails", async () => {
    mockedAxios.post.mockRejectedValue(new Error("Network error"));

    render(<FavoriteButtonMovie movieId={testMovieId} />);
    const initialButton = screen.getByRole("button", {
      name: /Add to favorites/i,
    });

    const consoleErrorMock = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    fireEvent.click(initialButton);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    const finalButton = screen.getByRole("button", {
      name: /Add to favorites/i,
    });
    expect(finalButton).toBeInTheDocument();
    expect(finalButton).not.toBeDisabled();

    consoleErrorMock.mockRestore();
  });
});
