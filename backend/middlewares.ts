import { IncomingMessage, ServerResponse } from "http";
import { RequestHandler } from "./types.js";
import { decodeToken, getUserFromToken, parseCookies } from "./auth.js";

const requestQueue: {
  req: IncomingMessage;
  res: ServerResponse;
  handler: RequestHandler;
}[] = [];
let processing = false;

export function queueRequest(
  req: IncomingMessage,
  res: ServerResponse,
  handler: RequestHandler
) {
  requestQueue.push({ req, res, handler });
  processQueue();
}

async function processQueue() {
  if (processing || requestQueue.length === 0) return;
  processing = true;
  const { req, res, handler } = requestQueue.shift()!;

  try {
    await handler(req, res);
  } catch (err) {
    console.error("Błąd podczas obsługi żądania:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
  processing = false;
  processQueue();
}

export async function onlyForAdmins(
  req: IncomingMessage,
  res: ServerResponse,
  handler: RequestHandler
) {
  const token = parseCookies(req)["token"];
  const user = await getUserFromToken(token);
  if (!user || user.role !== "admin") {
    res.writeHead(403, {
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify({ error: "Brak autoryzacji" }));
    return;
  }
  handler(req, res);
}
export function onlyForLogged(
  req: IncomingMessage,
  res: ServerResponse,
  handler: RequestHandler
) {
  const token = parseCookies(req)["token"];
  const isValid = decodeToken(token);
  if (!isValid) {
    res.writeHead(403, {
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify({ error: "Nie zalogowany" }));
    return;
  }
  handler(req, res);
}
