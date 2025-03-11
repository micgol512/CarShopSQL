import pkg from "pg";
import { Car, User } from "./types.js";
import { decodeToken } from "./auth.js";
const { Pool } = pkg;

export const pool = new Pool({
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
    const res = await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(20) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(10) CHECK (role IN ('admin', 'user')) NOT NULL,
    balance DOUBLE PRECISION DEFAULT 0 CHECK (balance >= 0)
    CONSTRAINT id_format CHECK (id ~ '^(admin|user)[0-9]+$')
);

CREATE TABLE IF NOT EXISTS cars (
    id SERIAL PRIMARY KEY,
    model VARCHAR(100) NOT NULL,
    price DOUBLE PRECISION NOT NULL CHECK (price >= 0),
    owner_id VARCHAR(20) REFERENCES users(id) ON DELETE SET NULL
);`);
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
      `INSERT INTO users (id, username,password,role,balance) VALUES ($1,$2,$3,$4,$5);`,
      [user.id, user.username, user.password, user.role, user.balance]
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

async function startData() {
  try {
    await pool.query(`SELECT id FROM users;`);
    await pool.query(`SELECT id FROM cars;`);
  } catch (_) {
    await createTables();
    await pool.query(`INSERT INTO users (id,username,password,role,balance) VALUES
      ('admin001','admin','admin123','admin',100000),
      ('user002','user','user123','user',10000);
        INSERT INTO cars (model, price) VALUES
    ('Zafira', 8000),
    ('Mazda', 12000),
    ('Opel', 10),
    ('Astra', 1000),
    ('Corsa', 500),
    ('Zafira', 12),
    ('Maluch', 2000),
    ('Peugeot', 10),
    ('Peugeot', 10);
    `);

    console.log("Utworzono nową baze danych i wypełniono danymi...");
  }
}
startData();
