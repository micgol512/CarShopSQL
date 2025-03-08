import pkg from "pg";
import { User } from "./types.js";
const { Pool } = pkg;

const pool = new Pool({
  user: "admin",
  host: "localhost",
  database: "workshop",
  password: "secret123",
  port: 5432,
});

async function test() {
  try {
    const res = await pool.query("SELECT current_user");
    console.log(
      "Połączenie poprawne! Aktualny użytkownik:",
      res.rows[0].current_user
    );
  } catch (err) {
    console.error("Błąd połączenia:", err);
  }
}
async function createTables(): Promise<void> {
  try {
    const res = await pool.query(`
CREATE TABLE IF NOT EXISTS Users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(6) NOT NULL CHECK (role IN ('admin', 'user')),
    balance DECIMAL(10,2) DEFAULT 0 CHECK (balance >= 0)
);

CREATE TABLE IF NOT EXISTS Cars (
    id SERIAL PRIMARY KEY,
    model VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    ownerId INT REFERENCES Users(id) ON DELETE SET NULL
);`);

    console.log("Utworzono tabele");
  } catch (err) {
    console.error("Coś poszło nie tak:", err);
  }
}
export async function getUsers(id?: string): Promise<void> {
  if (id) {
    try {
      const res = await pool.query(`SELECT * FROM users WHERE id='${id}'`);
      console.log("User:", res.rows[0]);
    } catch (err) {
      console.error("Błąd pobierania:", err);
    }
    return;
  }
  try {
    const res = await pool.query("SELECT * FROM users");
    console.log("USERS: ", res.rows[0]);
  } catch (err) {
    console.error("Błąd pobierania:", err);
  }
}
export async function addUser(user: User): Promise<void> {
  try {
    const res = await pool.query(
      `INSERT INTO users (username,password,role,balance) VALUES ('${user.username}','${user.password}','${user.role}','${user.balance}');`
    );
    console.log(
      `Dodano urzytkownika: ${user.username}" z rolą: "${user.role}" i snatem konta: "${user.balance}`
    );
    console.log("RES:", res);
  } catch (err) {
    console.error("Błąd dodawania :", err);
  }
}
export async function deleteUser(id: string) {
  try {
    const res = await pool.query(`DELETE FROM users WHERE id = '${id}';`);
    console.log(`Usunięto urzytkownika o ID: ${id}.`);
    console.log("RES:", res);
  } catch (err) {
    console.error("Błąd usuwania :", err);
  }
}
//// TESTy

// createTables();
const admin: User = {
  username: "admin",
  password: "admin123",
  role: "admin",
  balance: 100000,
};
const user1: User = {
  username: "user",
  password: "user123",
  role: "user",
  balance: 10000,
};
const user2: User = {
  username: "nowy",
  password: "user123",
  role: "user",
  balance: 10000,
};
// addUser(admin);
// getUsers();
async function doIT() {
  await createTables();
  await addUser(admin);
  await addUser(user1);
  await addUser(user2);
  await getUsers();
  await deleteUser("33");
}
doIT();
