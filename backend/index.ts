import http, { IncomingMessage, ServerResponse } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { onlyForAdmins, onlyForLogged, queueRequest } from "./middlewares.js";
import r from "./routes.js";
import { decodeToken, parseCookies } from "./auth.js";

console.clear();
console.log(` --> Uruchomiono serwer <--
 |
 |> ${process.env.HOSTNAME?.replace(":", "://")}:${process.env.PORT}
 |
`);

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
const PORT = process.env.PORT ?? "3000";
export const clients: ServerResponse[] = [];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  await delay(500); //symulation of server delay
  const reqUrl = req.url;
  console.log(`${req.method} -> ${req.url}`); //Logs for debugging (in future can be wtire to file)

  if (reqUrl === undefined) {
    r.notFoundHandler(req, res);
  } else if (
    /^\/(static\/)?(index\.html|style\.css|main\.js|favicon\.ico)?$/.test(
      reqUrl
    )
  ) {
    r.homeHandler(req, res);
  } else if (/^\/login\/?$/.test(reqUrl)) {
    r.loginHandler(req, res);
  } else if (/^\/users(\/[\w-]+)?\/?$/.test(reqUrl)) {
    onlyForAdmins(req, res, r.usersHandler);
  } else if (/^\/cars\/?$/.test(reqUrl) || /cars\/\d+\/buy\/?$/.test(reqUrl)) {
    onlyForLogged(req, res, r.carsHandler);
  } else if (/^\/hack\/\d+$/.test(reqUrl)) {
    onlyForAdmins(req, res, r.hackHandler);
  } else if (/^\/logout$/.test(reqUrl)) {
    r.logoutHandler(req, res);
  } else if (/^\/sse$/.test(reqUrl)) {
    r.sseHandler(req, res);
  } else if (/^\/register\/?$/.test(reqUrl)) {
    r.registerHandler(req, res);
  } else if (/^\/spr$/.test(reqUrl)) {
    console.log(decodeToken(parseCookies(req)["token"]));
    res.end("Sprawdzam token");
  } else {
    r.notFoundHandler(req, res);
  }
}

const server = http.createServer(async (req, res) => {
  queueRequest(req, res, handleRequest);
});

server.listen(PORT, () => {
  console.log(`Server running succesfull.`);
});
