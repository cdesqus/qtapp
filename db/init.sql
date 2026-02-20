-- Database Schema for IDE ERP System

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    signature TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    email TEXT,
    npwp BOOLEAN DEFAULT false,
    npwp_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS units (
    name TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'Barang' or 'Service'
    unit TEXT REFERENCES units(name),
    price DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'QUO', 'DO', 'BAP', 'INV'
    doc_number TEXT UNIQUE NOT NULL,
    customer_po TEXT,
    date DATE NOT NULL,
    client_id UUID REFERENCES clients(id),
    terms TEXT,
    status TEXT NOT NULL,
    invoice_notes TEXT,
    signature TEXT, -- Base64 signature
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    item_id UUID REFERENCES products(id),
    category TEXT,
    qty INTEGER NOT NULL,
    unit TEXT,
    sn TEXT,
    remarks TEXT,
    cost DECIMAL(15, 2),
    margin DECIMAL(5, 2),
    price DECIMAL(15, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS company_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- Seed Initial Data
INSERT INTO units (name) VALUES ('Pcs'), ('Unit'), ('Lot'), ('Kg'), ('Mtr') ON CONFLICT DO NOTHING;

-- Default Admin (password: 123)
INSERT INTO users (username, password, role) VALUES ('admin', '123', 'admin') ON CONFLICT (username) DO NOTHING;
INSERT INTO users (username, password, role) VALUES ('user', '123', 'user') ON CONFLICT (username) DO NOTHING;
