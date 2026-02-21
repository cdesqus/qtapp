const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function clearTransactions() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // transaction_items akan ter-delete otomatis karena ON DELETE CASCADE
        const res = await client.query(
            "DELETE FROM transactions WHERE type IN ('QUO', 'DO', 'BAP', 'INV')"
        );
        console.log('✅ Transactions dihapus:', res.rowCount, 'rows');
        console.log('✅ Transaction items terhapus otomatis (CASCADE)');

        await client.query('COMMIT');
        console.log('--- Selesai! Data Quotation, DO, BAST, dan Invoice berhasil dihapus. ---');
        console.log('--- Data clients, products, dan users TIDAK terpengaruh. ---');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

clearTransactions();
