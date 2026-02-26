const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5434/erp_db'
});

async function migrate() {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS currencies (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        symbol TEXT NOT NULL
      );
      INSERT INTO currencies (code, name, symbol) VALUES ('IDR', 'Rupiah', 'Rp'), ('USD', 'US Dollar', '$') ON CONFLICT DO NOTHING;
    `);

        // Alter products and transactions
        await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS currency TEXT REFERENCES currencies(code) DEFAULT 'IDR';`);
        await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS currency TEXT REFERENCES currencies(code) DEFAULT 'IDR';`);

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        pool.end();
    }
}

migrate();
