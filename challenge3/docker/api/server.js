const express = require('express');
const fs = require('fs');
// Require os to get the operating system information
const os = require('os');
// Require mysql for the database connection
const mysql = require('mysql');
// Require dotenv to read the environment variables from a .env file
require('dotenv').config();

const app = express();

// Create a connection to the database using a connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

// Route to get all books from the database
app.get('/api/books', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting database connection:', err);
            res.status(500).json({ error: 'Database error' });
            return;
        }
        connection.query('SELECT * FROM books', (error, results) => {
            connection.release(); // Release the connection back to the pool
            if (error) {
                console.error('Error executing query:', error);
                res.status(500).json({ error: 'Database error' });
                return;
            }
            res.json(results);
        });
    });
});

// Route to get a specific book by ID from the database
app.get('/api/books/:id', (req, res) => {
    const bookId = req.params.id; // Get the book ID from the request parameters
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting database connection:', err);
            res.status(500).json({ error: 'Database error' });
            return;
        }
        // Use a prepared statement to avoid SQL injection
        const query = 'SELECT * FROM books WHERE id = ?';
        connection.query(query, [bookId], (error, results) => {
            connection.release(); // Release the connection back to the pool
            if (error) {
                console.error('Error executing query:', error);
                res.status(500).json({ error: 'Database error' });
                return;
            }
            if (results.length === 0) {
                res.status(404).json({ error: 'Book not found' });
                return;
            }
            // Return the book details as JSON response
            res.json(results[0]);
        });
    });
});

// Route to handle get hostname from the docker container
app.get('/api/stats', (req, res) => {
    const stats = {
        containerHostname: os.hostname(),
        dockerHostHostname: process.env.HOSTNAME
    };
    res.json(stats);
});

// Start the server on port 8080 instead of 3000
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Close the database connection pool when the server is stopped
process.on('SIGINT', () => {
    pool.end((err) => {
        if (err) {
            console.error('Error closing database connection pool:', err);
            process.exit(1);
        }
        console.log('Database connection pool closed');
        process.exit(0);
    });
});
