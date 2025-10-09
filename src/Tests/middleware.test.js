import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedirect = vi.fn((url) => ({
  redirected: true,
  destination: url.toString(),
}));

const mockNextResponse = {
  redirect: mockRedirect,
  next: vi.fn(() => ({ pass: true })),
};

global.NextResponse = mockNextResponse;

const createMockRequest = (pathname, tokenValue) => {
  const request = {
    nextUrl: {
      pathname: pathname,
      toString: () => `http://localhost${pathname}`,
      origin: "http://localhost",
    },
    cookies: {
      get: vi.fn((name) => {
        if (name === "token" && tokenValue) {
          return { value: tokenValue };
        }
        return undefined;
      }),
    },
  };
  return request;
};

function middleware(request) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get("token")?.value || "";

  const isPublic = path === "/login" || path === "/signup";

  if (isPublic && token) {
    return NextResponse.redirect(new URL("/profile", request.nextUrl));
  }

  if (!isPublic && !token) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect logged-in user from /login to /profile", () => {
    const request = createMockRequest("/login", "valid-token-123");
    const response = middleware(request);

    expect(mockRedirect).toHaveBeenCalledWith(
      new URL("/profile", request.nextUrl)
    );
    expect(response.redirected).toBe(true);
    expect(response.destination).toBe("http://localhost/profile");
  });

  it("should redirect logged-in user from /signup to /profile", () => {
    const request = createMockRequest("/signup", "valid-token-123");
    const response = middleware(request);

    expect(mockRedirect).toHaveBeenCalledWith(
      new URL("/profile", request.nextUrl)
    );
    expect(response.destination).toBe("http://localhost/profile");
  });

  it("should redirect logged-out user from a private path like /profile to /login", () => {
    const request = createMockRequest("/profile/settings", "");
    const response = middleware(request);

    expect(mockRedirect).toHaveBeenCalledWith(
      new URL("/login", request.nextUrl)
    );
    expect(response.destination).toBe("http://localhost/login");
  });

  it("should redirect logged-out user from / to /login", () => {
    const request = createMockRequest("/", "");
    const response = middleware(request);

    expect(mockRedirect).toHaveBeenCalledWith(
      new URL("/login", request.nextUrl)
    );
    expect(response.destination).toBe("http://localhost/login");
  });

  it("should not redirect logged-out user when accessing a public path /login", () => {
    const request = createMockRequest("/login", "");
    const response = middleware(request);

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(response).toBeUndefined();
  });

  it("should not redirect logged-in user when accessing a private path /notifications", () => {
    const request = createMockRequest("/notifications", "valid-token-123");
    const response = middleware(request);

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(response).toBeUndefined();
  });

  it("should redirect logged-out user from /tvshows to /login", () => {
    const request = createMockRequest("/tvshows", "");
    const response = middleware(request);

    expect(mockRedirect).toHaveBeenCalledWith(
      new URL("/login", request.nextUrl)
    );
    expect(response.destination).toBe("http://localhost/login");
  });
});
