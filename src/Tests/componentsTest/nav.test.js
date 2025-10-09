import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import axios from "axios";

import Navbar from "@/app/components/Navbar";

//MOCKING SETUP

const mockPush = vi.fn();
const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: mockUsePathname,

  Link: ({ children, href }) => <a href={href}>{children}</a>,
}));

vi.mock("axios");
const mockedAxios = axios;

const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

let consoleErrorMock;

// TEST DATA
const user = { username: "TestUser" };
const checkTokenSuccess = { data: { user } };
const checkTokenFailure = new Error("Token expired");
const logoutSuccess = { status: 200 };
const logoutFailure = new Error("Server error");

describe("Navbar", () => {
  beforeEach(() => {
    mockedAxios.get.mockClear();
    mockPush.mockClear();
    mockUsePathname.mockClear();
    alertMock.mockClear();
    if (consoleErrorMock) {
      consoleErrorMock.mockRestore();
    }
  });

  // TEST 1

  it("renders a loading message initially", () => {
    mockedAxios.get.mockReturnValue(new Promise(() => {}));
    mockUsePathname.mockReturnValue("/");

    render(<Navbar />);

    expect(screen.getByText(/Loading navigation.../i)).toBeInTheDocument();
  });

  // TEST 2

  it("renders authenticated user greeting and links on successful token check", async () => {
    mockedAxios.get.mockResolvedValue(checkTokenSuccess);
    mockUsePathname.mockReturnValue("/tvshows");

    render(<Navbar />);

    e;
    await waitFor(() => {
      expect(screen.getByText(`Welcome: ${user.username}`)).toBeInTheDocument();

      expect(screen.getByText("Movie Search")).toBeInTheDocument();
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.queryByText("TV Show Search")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Logout/i })
      ).toBeInTheDocument();
    });
  });

  // TEST 3

  it("renders guest greeting and redirects to login/signup links on failed token check", async () => {
    consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedAxios.get.mockRejectedValue(checkTokenFailure);
    mockUsePathname.mockReturnValue("/");

    render(<Navbar />);

    await waitFor(() => {
      expect(screen.getByText("Welcome: Guest")).toBeInTheDocument();

      expect(
        screen.queryByRole("button", { name: /Logout/i })
      ).not.toBeInTheDocument();
    });
  });

  // TEST 4

  it('shows "Back to Profile" when logged in and NOT on /profile path', async () => {
    mockedAxios.get.mockResolvedValue(checkTokenSuccess);
    mockUsePathname.mockReturnValue("/movies");

    render(<Navbar />);

    await waitFor(() => {
      expect(screen.getByLabelText("Back to Profile")).toBeInTheDocument();
    });
  });

  it('hides "Back to Profile" when logged in and IS on /profile path', async () => {
    mockedAxios.get.mockResolvedValue(checkTokenSuccess);
    mockUsePathname.mockReturnValue("/profile");

    render(<Navbar />);

    await waitFor(() => {
      expect(
        screen.queryByLabelText("Back to Profile")
      ).not.toBeInTheDocument();
    });
  });

  // TEST 5

  it("calls logout API and redirects on successful logout click", async () => {
    mockedAxios.get.mockResolvedValueOnce(checkTokenSuccess);

    mockedAxios.get.mockResolvedValueOnce(logoutSuccess);
    mockUsePathname.mockReturnValue("/");

    render(<Navbar />);

    await waitFor(() =>
      expect(screen.getByText(`Welcome: ${user.username}`)).toBeInTheDocument()
    );

    const logoutButton = screen.getByRole("button", { name: /Logout/i });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith("/api/users/logout");

      expect(mockPush).toHaveBeenCalledWith("/login");

      expect(screen.getByText("Welcome: Guest")).toBeInTheDocument();

      expect(alertMock).not.toHaveBeenCalled();
    });
  });

  // TEST 6

  it("shows error alert and remains on current page on failed logout click", async () => {
    mockedAxios.get.mockResolvedValueOnce(checkTokenSuccess);

    mockedAxios.get.mockRejectedValueOnce(logoutFailure);
    mockUsePathname.mockReturnValue("/");

    render(<Navbar />);

    await waitFor(() =>
      expect(screen.getByText(`Welcome: ${user.username}`)).toBeInTheDocument()
    );

    consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => {});

    const logoutButton = screen.getByRole("button", { name: /Logout/i });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();

      expect(alertMock).toHaveBeenCalledWith(
        expect.stringContaining("Logout error: Server error")
      );

      expect(screen.getByText(`Welcome: ${user.username}`)).toBeInTheDocument();
    });
  });
});
