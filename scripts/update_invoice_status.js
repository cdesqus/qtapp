const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/erp_db'
});

async function updateInvoice() {
    try {
        const docNumber = 'INV202602009';
        const newStatus = 'Paid';
        
        const result = await pool.query(
            'UPDATE transactions SET status = $1 WHERE doc_number = $2 AND type = $3 RETURNING id',
            [newStatus, docNumber, 'INV']
        );

        if (result.rowCount > 0) {
            console.log(`Successfully updated invoice ${docNumber} status to Paid. (ID: ${result.rows[0].id})`);
        } else {
            console.log(`Invoice ${docNumber} not found.`);
        }
    } catch (err) {
        console.error('Error updating invoice:', err);
    } finally {
        await pool.end();
    }
}

updateInvoice();
