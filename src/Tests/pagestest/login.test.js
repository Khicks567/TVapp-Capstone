import React from "react";

import axios from "axios";

const Link = ({ href, children }) => <a href={href}>{children}</a>;

const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.spyOn(window, "alert").mockImplementation(() => {});

const LoginPage = () => {
  const router = useRouter();
  const [user, setUser] = React.useState({
    email: "",
    password: "",
  });

  const [buttonOff, setbuttonOff] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const signIn = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await axios.post("/api/users/login", user);
      console.log(response.data);

      router.push("/profile");
    } catch (error) {
      alert(error.message);
      console.log(error.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (user.email.length > 0 && user.password.length > 0) {
      setbuttonOff(false);
    } else {
      setbuttonOff(true);
    }
  }, [user]);

  return (
    <div className="formwhole">
      <h1>{loading ? "Page is loading" : "Login"}</h1>
      <form>
        <section className="forminputs">
          <label htmlFor="email">Email: </label>
          <input
            type="email"
            placeholder="Enter Email"
            name="email"
            id="email"
            value={user.email}
            onChange={(e) => setUser({ ...user, email: e.target.value })}
          />
        </section>

        <section className="forminputs">
          <label htmlFor="password">Password: </label>
          <input
            type="password"
            placeholder="Enter Password"
            name="password"
            id="password"
            value={user.password}
            onChange={(e) => setUser({ ...user, password: e.target.value })}
          />
        </section>
        <button
          onClick={signIn}
          className="pagebuttons"
          disabled={buttonOff || loading}
        >
          {buttonOff
            ? "Enter information"
            : loading
            ? "Processing..."
            : "Login"}
        </button>
      </form>
      <Link className="links" href="/signup">
        Go to Sign up page
      </Link>
    </div>
  );
};

describe("LoginPage", () => {
  const setup = () => {
    render(<LoginPage />);
    const emailInput = screen.getByLabelText(/Email:/i);
    const passwordInput = screen.getByLabelText(/Password:/i);
    const submitButton = screen.getByRole("button", {
      name: /Enter information|Login|Processing.../i,
    });
    return { emailInput, passwordInput, submitButton };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    axios.post.mockResolvedValue({ data: { message: "Login Successful" } });
  });

  it('should initialize with button disabled and "Enter information" text', () => {
    const { submitButton } = setup();
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent("Enter information");
  });

  it('should enable the button and change text to "Login" when both fields are filled', () => {
    const { emailInput, passwordInput, submitButton } = setup();

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    expect(submitButton).not.toBeDisabled();
    expect(submitButton).toHaveTextContent("Login");
  });

  it("should transition to loading state and call the login API on submission", async () => {
    const { emailInput, passwordInput, submitButton } = setup();
    const mockUser = { email: "test@example.com", password: "password123" };

    fireEvent.change(emailInput, { target: { value: mockUser.email } });
    fireEvent.change(passwordInput, { target: { value: mockUser.password } });

    fireEvent.click(submitButton);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Page is loading"
    );
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent("Processing...");

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/users/login", mockUser);
    });
  });

  it("should navigate to /profile on successful login", async () => {
    const { emailInput, passwordInput, submitButton } = setup();

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/profile");
    });
  });

  it("should display an alert and reset loading state on failed login", async () => {
    const errorMessage = "Request failed with status code 400";
    axios.post.mockRejectedValue({ message: errorMessage });

    const { emailInput, passwordInput, submitButton } = setup();

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpass" } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(errorMessage);
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Login"
      );
      expect(submitButton).not.toBeDisabled();
      expect(submitButton).toHaveTextContent("Login");
    });
  });
});
