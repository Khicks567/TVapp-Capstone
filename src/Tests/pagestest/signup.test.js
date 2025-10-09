import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import Signup from "./Signup";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("next/link", () => {
  return ({ children, href }) => {
    return <a href={href}>{children}</a>;
  };
});

vi.mock("axios");

describe("Signup", () => {
  const mockUser = {
    email: "test@example.com",
    username: "testuser",
    password: "password123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    axios.post.mockClear();
  });

  it('should display "Sign Up" and the "Enter information" button initially', () => {
    render(<Signup />);
    expect(
      screen.getByRole("heading", { name: "Sign Up" })
    ).toBeInTheDocument();
    const signUpButton = screen.getByRole("button", {
      name: "Enter information",
    });
    expect(signUpButton).toBeInTheDocument();
    expect(signUpButton).toBeDisabled();
  });

  it("should enable button when all fields are filled", async () => {
    render(<Signup />);
    const user = userEvent.setup();

    const emailInput = screen.getByLabelText(/Email:/i);
    const usernameInput = screen.getByLabelText(/Username:/i);
    const passwordInput = screen.getByLabelText(/Password:/i);
    const signUpButton = screen.getByRole("button", {
      name: "Enter information",
    });

    expect(signUpButton).toBeDisabled();

    await user.type(emailInput, mockUser.email);
    await user.type(usernameInput, mockUser.username);
    await user.type(passwordInput, mockUser.password);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign Up" })).toBeEnabled();
    });
  });

  it('should show email validation error if email is missing "@" symbol', async () => {
    render(<Signup />);
    const user = userEvent.setup();

    const emailInput = screen.getByLabelText(/Email:/i);
    const usernameInput = screen.getByLabelText(/Username:/i);
    const passwordInput = screen.getByLabelText(/Password:/i);

    await user.type(emailInput, "invalidemail.com");
    await user.type(usernameInput, mockUser.username);
    await user.type(passwordInput, mockUser.password);

    const signUpButton = screen.getByRole("button", { name: "Sign Up" });
    await user.click(signUpButton);

    expect(axios.post).not.toHaveBeenCalled();
    expect(
      screen.getByText("Email must contain the '@' symbol.")
    ).toBeInTheDocument();
  });

  it("should successfully register user and navigate to login page", async () => {
    axios.post.mockResolvedValueOnce({
      data: { message: "User registered successfully" },
    });
    render(<Signup />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Email:/i), mockUser.email);
    await user.type(screen.getByLabelText(/Username:/i), mockUser.username);
    await user.type(screen.getByLabelText(/Password:/i), mockUser.password);

    const signUpButton = screen.getByRole("button", { name: "Sign Up" });
    await user.click(signUpButton);

    expect(
      screen.getByRole("heading", { name: "Processing..." })
    ).toBeInTheDocument();
    expect(signUpButton).toBeDisabled();

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/users/signup", mockUser);
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByText("Processing...")).not.toBeInTheDocument();
  });

  it("should display API error message on registration failure", async () => {
    axios.post.mockRejectedValueOnce({
      response: {
        data: {
          error: "Username already taken.",
        },
      },
    });
    render(<Signup />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Email:/i), mockUser.email);
    await user.type(screen.getByLabelText(/Username:/i), mockUser.username);
    await user.type(screen.getByLabelText(/Password:/i), mockUser.password);

    const signUpButton = screen.getByRole("button", { name: "Sign Up" });
    await user.click(signUpButton);

    await waitFor(() => {
      expect(screen.getByText("Username already taken.")).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign Up" })).toBeEnabled();
  });

  it("should contain a link to the login page", () => {
    render(<Signup />);
    const loginLink = screen.getByRole("link", { name: "Go to login page" });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute("href", "/login");
  });
});
