// routes

import { get, IncomingMessage, ServerResponse } from "http";
import { loadCars, loadUsers, saveCars, saveUsers } from "./data.js";
import path from "path";
import { promises as fs } from "fs";
import { __dirname, clients } from "./index.js";
import { User } from "./types.js";
import {
  decodeToken,
  encodeToken,
  getUserFromToken,
  parseCookies,
  setAuthCookie,
} from "./auth.js";

export async function homeHandler(req: IncomingMessage, res: ServerResponse) {
  let filePath = path.join(__dirname, "../", "frontend", "index.html");

  if (req.url?.endsWith("/style.css")) {
    res.writeHead(200, { "Content-Type": "text/css" });
    filePath = path.join(__dirname, "../", "frontend", "style.css");
  } else if (req.url?.endsWith("/main.js")) {
    res.writeHead(200, { "Content-Type": "text/javascript" });
    filePath = path.join(__dirname, "../", "frontend", "main.js");
  } else {
    res.writeHead(200, { "Content-Type": "text/html" });
  }
  const data = await fs.readFile(filePath);
  res.end(data);
}
export async function carsHandler(req: IncomingMessage, res: ServerResponse) {
  const cars = await loadCars();
  if (req.method === "POST") {
    if (req.url?.endsWith("buy")) {
      const carID = req.url?.split("/")[2];
      const token = parseCookies(req)["token"];
      const userID = decodeToken(token)?.userId;

      if (carID && userID) {
        const car = cars.get(carID);
        if (!car) {
          res.writeHead(404, {
            "Content-Type": "application/json",
          });
          res.end(
            JSON.stringify({ error: "Nie znaleziono samochodu o danym id" })
          );
          return;
        }
        if (car.ownerId) {
          res.writeHead(403, {
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ error: "Samochód już jest sprzedany" }));
          return;
        }
        const users = await loadUsers();
        const user = await getUserFromToken(token);
        if (!user) {
          res.writeHead(404, {
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ error: "Nie znaleziono użytkownika" }));
          return;
        }
        if (user.balance < car.price) {
          res.writeHead(403, {
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ error: "Za mało środków" }));
          return;
        }
        user.balance -= car.price;
        car.ownerId = user.id;

        const data = `data: ${JSON.stringify({
          event: "CarPurchased",
          carId: car.id,
          buyerId: userID,
        })}\n\n`;
        clients.forEach((client) => client.write(data));
        users.set(user.id, user);

        await saveCars(cars.get());

        res.writeHead(200, {
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ message: "Kupiono auto" }));
      }
    } else {
      //add CAR
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const data = JSON.parse(body);
          const { model, price } = data;
          if (
            typeof model !== "string" ||
            typeof price !== "number" ||
            price < 0
          ) {
            res.writeHead(400, {
              "Content-Type": "application/json",
            });
            res.end(JSON.stringify({ error: "Niepoprawne dane" }));
            return;
          }
          const newCar = {
            id: cars.get().length.toString(),
            model,
            price,
            ownerId: null,
          };
          cars.add(newCar);
          saveCars(cars.get());
          res.writeHead(201, { "Content-Type": "application/json" });
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
      return;
    }
  } else {
    res.writeHead(200, {
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify(cars.get()));
  }
}
export async function usersHandler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");
  const users = await loadUsers();
  const token = parseCookies(req)["token"];
  const user = await getUserFromToken(token);
  if (!user) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Usera nie znaleziono." }));
    return;
  }
  if (req.method === "GET") {
    if (user.role !== "admin") {
      res.statusCode = 200;
      res.end(JSON.stringify(user));
    } else {
      const searchUserId = req.url?.split("/")[2];
      if (searchUserId) {
        const searchUser = users.get(searchUserId);
        if (!searchUser) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: "Użytkownik nie istnieje" }));
          return;
        }
        res.statusCode = 200;
        res.end(JSON.stringify(searchUser));
      } else {
        res.statusCode = 200;
        res.end(JSON.stringify(users.get()));
      }
    }
  } else if (req.method === "PUT") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        const { username, password } = data;
        if (username.length === 0 && password.length === 0) {
          res.statusCode = 403;
          res.end(
            JSON.stringify({
              error: "Brak potrzebnych informacji do aktualizacji",
            })
          );
          return;
        }
        if (username.length === 0) {
          res.statusCode = 200;
          users.set(user.id, { password });
          res.end(
            JSON.stringify({
              message: "Zaktualizowano hasło.",
            })
          );
        } else if (password.length === 0) {
          if (user.username.toLowerCase() === username.toLowerCase()) {
            res.statusCode = 203;
          } else {
            res.statusCode = 200;
            users.set(user.id, { username: username.toLowerCase() });
          }
          res.end(
            JSON.stringify({
              message: "Zaktualizowano nazwę użytkownika.",
              error: "Nowa nazwa użytkownika jest taka sama jak poprzednia.",
            })
          );
        } else {
          users.set(user.id, { username: username.toLowerCase(), password });
          res.end(
            JSON.stringify({ message: "Zaktualizowano dane profilowe." })
          );
        }
        await saveUsers(users.get());
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }
    });
  } else if (req.method === "DELETE") {
    users.delete(user.id);
    await saveUsers(users.get());
    res.end(JSON.stringify({ message: "Usunięto użytkownika." }));
  } else {
    res.statusCode = 405;
    res.end(
      JSON.stringify({
        error: "Ta metoda nie jest obsługiwana dla tego endpointu.",
      })
    );
  }
}

export async function hackHandler(req: IncomingMessage, res: ServerResponse) {
  const users = await loadUsers();
  const token = parseCookies(req)["token"];
  const userID = decodeToken(token)?.userId as string;
  const cash = req.url ? parseInt(req.url.split("/")[2]) : 1000;
  const user = users.get(userID);
  console.log("Hakowy", users.get(userID));
  if (!user) {
    res.statusCode = 403;
    res.end(
      JSON.stringify({
        message: "Błąd odczytu użytkownika",
      })
    );
    return;
  }
  user.balance += cash;
  res.writeHead(202, {
    "Content-Type": "application/json",
  });
  res.end(
    JSON.stringify({
      message: `Hacked!!! User o ID: "${userID}" dodał ${cash} na swoje konto`,
    })
  );
  await saveUsers(users.get());
}
export function notFoundHandler(req: IncomingMessage, res: ServerResponse) {
  res.writeHead(404, { "Content-Type": "text/html" });
  res.end("<h1>404 - Not Found</h1>");
}

export async function loginHandler(req: IncomingMessage, res: ServerResponse) {
  const users = await loadUsers();
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    try {
      const data = JSON.parse(body);
      const { username, password } = data;
      const user = users
        .get()
        .find((u) => u.username === username && u.password === password);

      if (user) {
        setAuthCookie(res, encodeToken(user.id));
        res.writeHead(200, { "Content-Type": "application/json" });

        if (user.role !== "admin") {
          res.end(JSON.stringify(user));
        } else {
          res.end(JSON.stringify(users.get()));
        }
      } else {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Błędne dane logowania" }));
      }
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
  });
  return;
}
export async function logoutHandler(req: IncomingMessage, res: ServerResponse) {
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Set-Cookie":
      "token=; HttpOnly; Secure; SameSite=Strict; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  });
  res.end(JSON.stringify({ message: "Wylogowano" }));
}
export async function registerHandler(
  req: IncomingMessage,
  res: ServerResponse,
  role: User["role"] = "user"
) {
  const users = await loadUsers();
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    try {
      const data = JSON.parse(body);
      const { username, password } = data;
      if (
        typeof username !== "string" ||
        typeof password !== "string" ||
        users.get(username)
      ) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Niepoprawne dane" }));
        return;
      }
      if (users.get().find((u) => u.username === username)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Użytkownik już istnieje" }));
        return;
      }
      const newUser = {
        id: `${username.toLowerCase()}${users
          .get()
          .length.toString()
          .padStart(3, "0")}`,
        username: username.toLowerCase(),
        password: password,
        role: role,
        balance: 0,
      };
      users.add(newUser as User);
      saveUsers(users.get());
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(newUser));
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
  });
}
export async function sseHandler(req: IncomingMessage, res: ServerResponse) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  clients.push(res);
  console.log("Nowy klient SSE podłączony!");

  req.on("close", () => {
    clients.splice(clients.indexOf(res), 1);
    console.log("Klient SSE odłączony");
  });
}
export default {
  homeHandler,
  carsHandler,
  usersHandler,
  hackHandler,
  notFoundHandler,
  loginHandler,
  logoutHandler,
  registerHandler,
  sseHandler,
};
