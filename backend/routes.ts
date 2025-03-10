// routes

import { IncomingMessage, ServerResponse } from "http";
import path from "path";
import { promises as fs } from "fs";
import { __dirname, clients } from "./index.js";
import { Car, User } from "./types.js";
import {
  decodeToken,
  encodeToken,
  getUserFromToken,
  parseCookies,
  setAuthCookie,
} from "./auth.js";
import { pool } from "./sqlQuerys.js";

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
  if (req.method === "POST") {
    if (req.url?.endsWith("buy")) {
      const carID = req.url?.split("/")[2];
      const token = parseCookies(req)["token"];
      const userID = decodeToken(token)?.userId;
      if (carID && userID) {
        const {
          rows: [car],
        } = await pool.query<Car>(`SELECT * FROM cars WHERE id=$1;`, [carID]);
        // const car = cars.map((car) => car.id === carID);
        if (!car) {
          res.writeHead(404, {
            "Content-Type": "application/json",
          });
          res.end(
            JSON.stringify({ error: "Nie znaleziono samochodu o danym id" })
          );
          return;
        }

        if (car.owner_id) {
          res.writeHead(403, {
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ error: "Samochód już jest sprzedany" }));
          return;
        }
        // const { rows: users } = await pool.query<User>(
        //   `SELECT * FROM users WHERE id='${carID}';`
        // );
        const user = await getUserFromToken(token);
        if (!user) {
          res.writeHead(404, {
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ error: "Nie znaleziono użytkownika" }));
          return;
        }
        console.log(
          `User Balance: ${user.balance}. koszt samochodu: ${
            car.price
          }. Czy stać? ${user.balance < car.price ? "NIE" : "TAK"}`
        );

        if (user.balance < car.price) {
          res.writeHead(403, {
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ error: "Za mało środków" }));
          return;
        }
        const newBalance = user.balance - car.price;
        await pool.query(`UPDATE users SET balance = $1 WHERE id = $2;`, [
          newBalance,
          user.id,
        ]);
        await pool.query(`UPDATE cars SET owner_id = $1 WHERE id = $2`, [
          user.id,
          car.id,
        ]);

        const data = `data: ${JSON.stringify({
          event: "CarPurchased",
          carId: car.id,
          buyerId: userID,
        })}\n\n`;
        clients.forEach((client) => client.write(data));

        res.writeHead(200, {
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ message: "Kupiono auto" }));
      }
    } else {
      //add CAR
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
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

          await pool.query(`INSERT INTO cars (model, price) VALUES ($1,$2)`, [
            model,
            price,
          ]);

          res.writeHead(201, { "Content-Type": "application/json" });
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e }));
        }
      });
      return;
    }
  } else {
    // const result: QueryResult<Car> = await pool.query(`SELECT * FROM cars;`);
    // const cars: Car[] = result.rows;
    const { rows: cars } = await pool.query<Car>(
      `SELECT * FROM cars ORDER BY id;`
    );
    res.writeHead(200, {
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify(cars));
  }
}
export async function usersHandler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");

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
        const {
          rows: [searchUser],
        } = await pool.query<User>(`SELECT * FROM users WHERE id=$1`, [
          searchUserId,
        ]);
        if (!searchUser) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: "Użytkownik nie istnieje" }));
          return;
        }
        res.statusCode = 200;
        res.end(JSON.stringify(searchUser));
      } else {
        const { rows: users } = await pool.query<User>(`SELECT * FROM users;`);
        res.statusCode = 200;
        res.end(JSON.stringify(users));
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
          // users.set(user.id, { password });
          await pool.query<User>(
            `UPDATE users SET password = $1 WHERE id = $2;`,
            [password, user.id]
          );
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
            await pool.query<User>(
              `UPDATE users SET username = $1 WHERE id = $2;`,
              [username.toLowerCase(), user.id]
            );
            // users.set(user.id, { username: username.toLowerCase() });
          }
          res.end(
            JSON.stringify({
              message: "Zaktualizowano nazwę użytkownika.",
              error: "Nowa nazwa użytkownika jest taka sama jak poprzednia.",
            })
          );
        } else {
          await pool.query<User>(
            `UPDATE users SET username = $1,password=$2 WHERE id = $3;`,
            [username.toLowerCase(), password, user.id]
          );
          res.end(
            JSON.stringify({ message: "Zaktualizowano dane profilowe." })
          );
        }
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }
    });
  } else if (req.method === "DELETE") {
    await pool.query<User>(`DELETE FROM users WHERE id = $1;`, [user.id]);
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
  const token = parseCookies(req)["token"];
  const cash = req.url ? parseInt(req.url.split("/")[2]) : 1000;
  const user = await getUserFromToken(token);
  console.log("Hakowy", user);
  if (!user) {
    res.statusCode = 403;
    res.end(
      JSON.stringify({
        message: "Błąd odczytu użytkownika",
      })
    );
    return;
  }
  await pool.query<User>(`UPDATE users SET balance=$1 WHERE id=$2`, [
    user.balance + cash,
    user.id,
  ]);
  res.writeHead(202, {
    "Content-Type": "application/json",
  });
  res.end(
    JSON.stringify({
      message: `Hacked!!! User o ID: "${user.id}" dodał ${cash} na swoje konto`,
    })
  );
}
export function notFoundHandler(req: IncomingMessage, res: ServerResponse) {
  res.writeHead(404, { "Content-Type": "text/html" });
  res.end("<h1>404 - Not Found</h1>");
}
export async function loginHandler(req: IncomingMessage, res: ServerResponse) {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    try {
      const data = JSON.parse(body);
      const { username, password } = data;
      const {
        rows: [user],
      } = await pool.query<User>(
        `SELECT * FROM users WHERE username=$1 AND password=$2;`,
        [username, password]
      );

      if (user) {
        setAuthCookie(res, encodeToken(user.id));
        res.writeHead(200, { "Content-Type": "application/json" });
        if (user.role !== "admin") {
          res.end(JSON.stringify(user));
        } else {
          const { rows: users } = await pool.query<User>(
            `SELECT username,balance FROM users ORDER BY id ASC;`
          );
          res.end(JSON.stringify(users));
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
  // const users = await loadUsers();
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    try {
      const data = await JSON.parse(body);
      const { username, password } = data;

      const {
        rows: [checkUser],
      } = await pool.query<User>(
        `SELECT username FROM users WHERE username=$1;`,
        [username]
      );

      if (typeof username !== "string" || typeof password !== "string") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Niepoprawne dane" }));
        return;
      }
      console.log("checkUser:", checkUser);
      if (checkUser) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Użytkownik już istnieje" }));
        return;
      }

      const {
        rows: [{ count }],
      } = await pool.query(`SELECT COUNT(*) FROM users;`);
      console.log(`Liczba userow: ${count}`);

      const newUser = {
        id: `${username.toLowerCase()}${count.toString().padStart(3, "0")}`,
        username: username.toLowerCase(),
        password: password,
        role: role,
        balance: 0,
      };
      await pool.query<User>(
        `INSERT INTO users (id,username,password,role,balance) VALUES
      ($1,$2,$3,$4,$5);`,
        [
          newUser.id,
          newUser.username,
          newUser.password,
          newUser.role,
          newUser.balance,
        ]
      );
      console.log("tu dziala");

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
