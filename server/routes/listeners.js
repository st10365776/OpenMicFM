
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// =========================================
// 1. REGISTER A NEW LISTENER
// =========================================

router.post('/register', async (req, res) => {
  const { fullName, email, password } = req.body || {};

  if (
    typeof fullName !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !fullName.trim() ||
    !email.trim()
  ) {
    return res.status(400).json({
      error: 'Please fill in all fields.'
    });
  }

  const name = fullName.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (
    name.length > 120 ||
    cleanEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
  ) {
    return res.status(400).json({
      error: 'Please enter a valid name and email.'
    });
  }

  if (
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    return res.status(400).json({
      error: 'Password must have at least 8 characters, including uppercase, lowercase, number and symbol.'
    });
  }

  try {
    // Encrypt the password using a secure hash
    const passwordHash = await bcrypt.hash(password, 12);

    // Save the listener in SQL Server
    const result = await pool.query(
      `INSERT INTO listeners
       (full_name, email, password_hash)
       OUTPUT INSERTED.id, INSERTED.full_name, INSERTED.email
       VALUES (@p1, @p2, @p3)`,
      [name, cleanEmail, passwordHash]
    );

    const listener = result.recordset[0];

    res.status(201).json({
      message: 'Registration successful.',
      user: {
        id: listener.id,
        fullName: listener.full_name,
        email: listener.email
      }
    });

  } catch (error) {
    if (error.number === 2601 || error.number === 2627) {
      return res.status(409).json({
        error: 'This email is already registered.'
      });
    }

    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed.'
    });
  }
});

// =========================================
// 2. LOGIN A LISTENER
// =========================================

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      error: 'Email and password are required.'
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, full_name, email, password_hash
       FROM listeners
       WHERE LOWER(email) = @p1`,
      [email.trim().toLowerCase()]
    );

    const listener = result.recordset[0];

    if (
      !listener ||
      !(await bcrypt.compare(password, listener.password_hash))
    ) {
      return res.status(401).json({
        error: 'Invalid email or password.'
      });
    }

    // Generate a login token
    const token = jwt.sign(
      {
        id: listener.id,
        type: 'listener'
      },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: listener.id,
        fullName: listener.full_name,
        email: listener.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed.'
    });
  }
});

// =========================================
// 3. GET LOGGED-IN LISTENER
// =========================================

router.get('/me', async (req, res) => {
  const authorization = req.headers.authorization || '';

  if (!authorization.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Login required.'
    });
  }

  try {
    const token = authorization.slice(7);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (decoded.type !== 'listener') {
      return res.status(403).json({
        error: 'Access denied.'
      });
    }

    const result = await pool.query(
      `SELECT id, full_name, email
       FROM listeners
       WHERE id = @p1`,
      [decoded.id]
    );

    const listener = result.recordset[0];

    if (!listener) {
      return res.status(401).json({
        error: 'Listener not found.'
      });
    }

    res.json({
      user: {
        id: listener.id,
        fullName: listener.full_name,
        email: listener.email
      }
    });

  } catch (error) {
    res.status(401).json({
      error: 'Invalid or expired session.'
    });
  }
});

module.exports = router;
