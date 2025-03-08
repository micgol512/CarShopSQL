import { loadUsers } from "./data.js";
import { TokenPayload, User } from "./types.js";
import { ServerResponse, IncomingMessage } from "http";
import jwt from "jsonwebtoken";

export function encodeToken(userId: string): string {
  const SecretKey: string = process.env.SECRET_KEY as string;
  const payload: TokenPayload = { userId };
  return jwt.sign(payload, SecretKey, { expiresIn: "1h" });
}
export function decodeToken(token: string): TokenPayload | null {
  const SecretKey: string = process.env.SECRET_KEY as string;
  try {
    return jwt.verify(token, SecretKey) as TokenPayload;
  } catch (error) {
    return null;
  }
}
export async function getUserFromToken(token: string): Promise<User | null> {
  const users = await loadUsers();
  const id = decodeToken(token);
  if (!id) {
    return null;
  }
  return users.get(id.userId);
}

export function setAuthCookie(
  res: ServerResponse,
  token: string,
  maxAge?: number
): void {
  res.setHeader(
    "set-cookie",
    `token=${token}; ${maxAge ? `max-age=${maxAge}` : ""};`
  );
}

export function parseCookies(req: IncomingMessage): Record<string, string> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    console.log("No cookies");
    return {};
  }
  return cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.split("=");
    acc[key.trim()] = value;
    return acc;
  }, {} as Record<string, string>);
}
