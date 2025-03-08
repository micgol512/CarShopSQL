import pkg from "pg";
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

test();
