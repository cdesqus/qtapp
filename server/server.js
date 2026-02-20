const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

// 1. Security Headers (Helmet)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "https:"],
            "script-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://unpkg.com"],
        },
    },
}));

// 2. Rate Limiting (Brute Force Protection)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login requests per windowMs
    message: { error: "Terlalu banyak percobaan login. Silakan coba lagi nanti." }
});

// 3. Middlewares
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 'https://erp.kaumtech.com' : true,
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Utility to convert snake_case to camelCase
const toCamel = (obj) => {
    if (Array.isArray(obj)) return obj.map(v => toCamel(v));
    if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            const camelKey = key.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
            result[camelKey] = toCamel(obj[key]);
            return result;
        }, {});
    }
    return obj;
};

const sendJson = (res, data) => res.json(toCamel(data));

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/erp_db'
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Database connection error:', err.stack);
    } else {
        console.log('✅ Connected to PostgreSQL database');
        release();
    }
});

// 4. JWT Authentication Middleware
const authenticate = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Sesi berakhir, silakan login kembali.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token tidak valid.' });
    }
};

// --- Auth Routes ---
app.post('/api/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (user && (password === user.password || await bcrypt.compare(password, user.password))) {
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 8 * 60 * 60 * 1000 // 8 hours
            });

            const { password: _, ...userWithoutPassword } = user;
            sendJson(res, userWithoutPassword);
        } else {
            res.status(401).json({ error: 'Username atau password salah' });
        }
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: 'Gagal terhubung ke database' });
    }
});

app.get('/api/me', authenticate, (req, res) => {
    res.json(req.user);
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

// --- API Routes (Protected) ---

// --- Users ---
app.get('/api/users', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, role FROM users ORDER BY username');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    const { username, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const result = await pool.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
            [username, hashedPassword, role]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/users/:id', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { username, password, role } = req.body;
    try {
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query('UPDATE users SET username=$1, password=$2, role=$3 WHERE id=$4', [username, hashedPassword, role, id]);
        } else {
            await pool.query('UPDATE users SET username=$1, role=$2 WHERE id=$3', [username, role, id]);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/users/:id', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Units ---
app.get('/api/units', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT name FROM units ORDER BY name');
        res.json(result.rows.map(r => r.name));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/units', authenticate, async (req, res) => {
    try {
        await pool.query('INSERT INTO units (name) VALUES ($1) ON CONFLICT DO NOTHING', [req.body.name]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/units/:name', authenticate, async (req, res) => {
    try {
        await pool.query('DELETE FROM units WHERE name = $1', [req.params.name]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/units/:oldName', authenticate, async (req, res) => {
    const { oldName } = req.params;
    const { newName } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('INSERT INTO units (name) VALUES ($1)', [newName]);
        await client.query('UPDATE products SET unit = $1 WHERE unit = $2', [newName, oldName]);
        await client.query('UPDATE transaction_items SET unit = $1 WHERE unit = $2', [newName, oldName]);
        await client.query('DELETE FROM units WHERE name = $1', [oldName]);
        await client.query('COMMIT');
        sendJson(res, { success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// --- Clients ---
app.get('/api/clients', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clients ORDER BY name');
        sendJson(res, result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/clients', authenticate, async (req, res) => {
    const { name, address, email, npwp, npwpNumber } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO clients (name, address, email, npwp, npwp_number) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, address, email, npwp, npwpNumber]
        );
        sendJson(res, result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/clients/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { name, address, email, npwp, npwpNumber } = req.body;
    try {
        await pool.query(
            'UPDATE clients SET name=$1, address=$2, email=$3, npwp=$4, npwp_number=$5 WHERE id=$6',
            [name, address, email, npwp, npwpNumber, id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/clients/:id', authenticate, async (req, res) => {
    try {
        await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Products ---
app.get('/api/products', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY name');
        sendJson(res, result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', authenticate, async (req, res) => {
    const { name, description, category, unit, price } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO products (name, description, category, unit, price) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, description, category, unit, price]
        );
        sendJson(res, result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Transactions ---
app.get('/api/transactions', authenticate, async (req, res) => {
    const { type } = req.query;
    try {
        let query = 'SELECT t.*, c.name as client_name FROM transactions t LEFT JOIN clients c ON t.client_id = c.id';
        const params = [];
        if (type) {
            query += ' WHERE t.type = $1';
            params.push(type);
        }
        query += ' ORDER BY t.date DESC';
        const result = await pool.query(query, params);
        sendJson(res, result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/transactions/:id', authenticate, async (req, res) => {
    try {
        const tx = await pool.query('SELECT t.*, c.name as client_name FROM transactions t LEFT JOIN clients c ON t.client_id = c.id WHERE t.id = $1', [req.params.id]);
        const items = await pool.query('SELECT * FROM transaction_items WHERE transaction_id = $1', [req.params.id]);
        sendJson(res, { ...tx.rows[0], items: items.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/transactions', authenticate, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { type, docNumber, customerPo, date, clientId, terms, status, items } = req.body;

        const txResult = await client.query(
            'INSERT INTO transactions (type, doc_number, customer_po, date, client_id, terms, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [type, docNumber, customerPo, date, clientId, terms, status]
        );
        const txId = txResult.rows[0].id;

        for (const item of items) {
            await client.query(
                'INSERT INTO transaction_items (transaction_id, item_id, category, qty, unit, sn, remarks, cost, margin, price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                [txId, item.itemId, item.category, item.qty, item.unit, item.sn, item.remarks, item.cost, item.margin, item.price]
            );
        }

        await client.query('COMMIT');
        sendJson(res, { id: txId });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.delete('/api/transactions/:id', authenticate, async (req, res) => {
    try {
        await pool.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/transactions/:id/status', authenticate, async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query('UPDATE transactions SET status = $1 WHERE id = $2', [status, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/transactions/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { docNumber, customerPo, date, clientId, terms, status, items, invoiceNotes, signature } = req.body;

        await client.query(
            'UPDATE transactions SET doc_number=$1, customer_po=$2, date=$3, terms=$4, status=$5, invoice_notes=$6, signature=$7 WHERE id=$8',
            [docNumber, customerPo, date, terms, status, invoiceNotes, signature, id]
        );

        await client.query('DELETE FROM transaction_items WHERE transaction_id = $1', [id]);

        for (const item of items) {
            await client.query(
                'INSERT INTO transaction_items (transaction_id, item_id, category, qty, unit, sn, remarks, cost, margin, price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                [id, item.itemId || item.item_id, item.category, item.qty, item.unit, item.sn, item.remarks, item.cost, item.margin, item.price]
            );
        }

        await client.query('COMMIT');
        sendJson(res, { success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// --- Settings ---
app.get('/api/settings', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM company_settings');
        const settings = {};
        result.rows.forEach(row => settings[row.key] = row.value);
        sendJson(res, settings);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/settings', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    try {
        const settings = req.body;
        for (const key in settings) {
            await pool.query(
                'INSERT INTO company_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
                [key, JSON.stringify(settings[key])]
            );
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
