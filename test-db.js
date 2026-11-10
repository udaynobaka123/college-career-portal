require("dotenv").config();

const { pool } = require("./config/db");

async function testDatabase() {
  try {
    const result = await pool.query("SELECT current_database(), current_user");

    console.log("PostgreSQL connection successful!");
    console.log(result.rows[0]);
  } catch (error) {
    console.error("PostgreSQL connection failed:");
    console.error(error.message);
  } finally {
    await pool.end();
  }
}

testDatabase();
