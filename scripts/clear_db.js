const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function clearDb() {
    const client = await pool.connect();
    try {
        console.log('--- Clearing Database Data ---');

        await client.query('BEGIN');

        // Order matters if not using CASCADE, but TRUNCATE CASCADE is easier
        // We want to keep 'users' and 'units'

        console.log('Truncating tables...');
        await client.query('TRUNCATE transaction_items, transactions, products, clients, company_settings RESTART IDENTITY CASCADE');

        console.log('✅ Tables truncated: transaction_items, transactions, products, clients, company_settings');

        // Re-check users and units (seeds)
        await client.query("INSERT INTO units (name) VALUES ('Pcs'), ('Unit'), ('Lot'), ('Kg'), ('Mtr') ON CONFLICT DO NOTHING");
        console.log('✅ Units re-seeded');

        await client.query("INSERT INTO users (username, password, role) VALUES ('admin', '123', 'admin') ON CONFLICT (username) DO NOTHING");
        await client.query("INSERT INTO users (username, password, role) VALUES ('user', '123', 'user') ON CONFLICT (username) DO NOTHING");
        console.log('✅ Default users ensured');

        await client.query('COMMIT');
        console.log('--- Database cleared successfully! ---');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error clearing database:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

clearDb();
