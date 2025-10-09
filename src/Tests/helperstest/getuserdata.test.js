import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import JWT from "jsonwebtoken";

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn(),
  },
}));

const MOCK_SECRET = "mock-secret";
process.env.JWTSECRET = MOCK_SECRET;
const MOCK_TOKEN = "mock.jwt.token";
const MOCK_USER_ID = "auth_user_123";

const getData = (request) => {
  try {
    const token = request.cookies.get("token")?.value || "";

    const decodedtoken = JWT.verify(token, process.env.JWTSECRET);
    return decodedtoken.id;
  } catch (error) {
    throw new Error(error.message);
  }
};

describe("getData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = (tokenValue) => {
    const request = new NextRequest("http://localhost");
    request.cookies.get = vi.fn((name) => {
      if (name === "token" && tokenValue !== undefined) {
        return { name: "token", value: tokenValue };
      }
      return undefined;
    });
    return request;
  };

  it("should successfully decode a valid token and return the user ID", () => {
    const mockRequest = createMockRequest(MOCK_TOKEN);
    JWT.verify.mockReturnValue({ id: MOCK_USER_ID, username: "test" });

    const userId = getData(mockRequest);

    expect(mockRequest.cookies.get).toHaveBeenCalledWith("token");
    expect(JWT.verify).toHaveBeenCalledWith(MOCK_TOKEN, MOCK_SECRET);
    expect(userId).toBe(MOCK_USER_ID);
  });

  it("should throw an error if no token is present in the cookies", () => {
    const mockRequest = createMockRequest(undefined);
    JWT.verify.mockImplementation(() => {
      throw new Error("jwt must be provided");
    });

    expect(() => getData(mockRequest)).toThrow("jwt must be provided");
    expect(JWT.verify).toHaveBeenCalledWith("", MOCK_SECRET);
  });

  it("should throw an error if the token is invalid or expired", () => {
    const mockRequest = createMockRequest(MOCK_TOKEN);
    const jwtError = new Error("jwt expired");
    JWT.verify.mockImplementation(() => {
      throw jwtError;
    });

    expect(() => getData(mockRequest)).toThrow("jwt expired");
    expect(JWT.verify).toHaveBeenCalledWith(MOCK_TOKEN, MOCK_SECRET);
  });

  it("should throw an error if the secret is missing and JWT verify fails", () => {
    process.env.JWTSECRET = undefined;
    const mockRequest = createMockRequest(MOCK_TOKEN);
    const secretError = new Error("secret must be defined");

    JWT.verify.mockImplementation(() => {
      throw secretError;
    });

    expect(() => getData(mockRequest)).toThrow("secret must be defined");

    process.env.JWTSECRET = MOCK_SECRET;
  });
});
