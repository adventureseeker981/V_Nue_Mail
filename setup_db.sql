-- V_Nue Mail Database Setup Script
-- Run this with: psql -U postgres < setup_db.sql

-- Create database
CREATE DATABASE v_nue_mail;

-- Connect to the database
\c v_nue_mail;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender TEXT NOT NULL,
    recipient TEXT[] NOT NULL,
    subject TEXT DEFAULT '(NO SUBJECT)',
    body TEXT,
    body_html TEXT DEFAULT '',
    cc TEXT DEFAULT '',
    bcc TEXT DEFAULT '',
    raw_headers TEXT,
    status TEXT DEFAULT 'unread',
    recipient_trash BOOLEAN DEFAULT FALSE,
    sender_trash BOOLEAN DEFAULT FALSE,
    recipient_deleted BOOLEAN DEFAULT FALSE,
    sender_deleted BOOLEAN DEFAULT FALSE,
    recipient_starred BOOLEAN DEFAULT FALSE,
    sender_starred BOOLEAN DEFAULT FALSE,
    recipient_important BOOLEAN DEFAULT FALSE,
    sender_important BOOLEAN DEFAULT FALSE,
    recipient_archived BOOLEAN DEFAULT FALSE,
    sender_archived BOOLEAN DEFAULT FALSE,
    recipient_spam BOOLEAN DEFAULT FALSE,
    snoozed_until TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ,
    is_confidential BOOLEAN DEFAULT FALSE,
    attachments JSONB DEFAULT '[]'::jsonb,
    category TEXT DEFAULT 'primary',
    labels TEXT[] DEFAULT '{}',
    is_draft BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom labels table
CREATE TABLE IF NOT EXISTS custom_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#299EFF',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'dark',
    density TEXT DEFAULT 'comfortable',
    signature TEXT DEFAULT '',
    keyboard_shortcuts BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Insert a test user (password: test123)
-- Note: In production, use bcrypt hashed passwords
INSERT INTO users (email, password_hash, display_name) 
VALUES ('test@vnuemail.local', '$2a$10$rQZ9Z9Z9Z9Z9Z9Z9Z9Z9ZO', 'Test User')
ON CONFLICT (email) DO NOTHING;

GRANT ALL PRIVILEGES ON DATABASE v_nue_mail TO postgres;
