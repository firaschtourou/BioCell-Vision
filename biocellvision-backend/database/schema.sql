-- database/schema.sql
-- Création de la base de données
CREATE DATABASE biocellvision_db;

-- Connexion à la base
\c biocellvision_db;

-- Création de la table users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Création d'un index
CREATE INDEX idx_users_email ON users(email);

-- Insertion d'un utilisateur de test (mot de passe: test123)
INSERT INTO users (nom, email, password) 
VALUES (
    'Utilisateur Test',
    'test@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2NB.SZqbkW'
);