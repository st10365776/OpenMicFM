
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../db');

const router = express.Router();
const googleClient = new OAuth2Client();

function createListenerToken(listener) {
  return jwt.sign(
    {
      id: listener.id,
      type: 'listener'
    },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function isDuplicateEmailError(error) {
  return error.number === 2601 || error.number === 2627;
}

function authenticatedListenerId(req, res) {
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Login required.' });
    return null;
  }

  try {
    const decoded = jwt.verify(authorization.slice(7), process.env.JWT_SECRET);
    if (decoded.type !== 'listener') {
      res.status(403).json({ error: 'Access denied.' });
      return null;
    }
    if (!Number.isSafeInteger(Number(decoded.id)) || Number(decoded.id) < 1) {
      res.status(401).json({ error: 'Invalid or expired session.' });
      return null;
    }
    return Number(decoded.id);
  } catch {
    res.status(401).json({ error: 'Invalid or expired session.' });
    return null;
  }
}

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
      token: createListenerToken(listener),
      user: {
        id: listener.id,
        fullName: listener.full_name,
        email: listener.email
      }
    });

  } catch (error) {
    if (isDuplicateEmailError(error)) {
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

    res.json({
      message: 'Login successful.',
      token: createListenerToken(listener),
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

router.get('/google-config', (_req, res) => {
  res.json({
    clientId: process.env.GOOGLE_CLIENT_ID || ''
  });
});

router.post('/google', async (req, res) => {
  const { credential } = req.body || {};
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return res.status(503).json({
      error: 'Google sign-in is not configured.'
    });
  }

  if (typeof credential !== 'string' || !credential || credential.length > 10000) {
    return res.status(400).json({
      error: 'A valid Google credential is required.'
    });
  }

  let claims;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId
    });
    claims = ticket.getPayload();
  } catch (error) {
    console.error('Google token verification request failed:', error);
    return res.status(401).json({
      error: 'The Google sign-in credential is invalid or could not be verified.'
    });
  }

  if (!claims) {
    return res.status(401).json({
      error: 'The Google account could not be verified.'
    });
  }

  const verifiedEmail = typeof claims.email === 'string'
    ? claims.email.trim().toLowerCase()
    : '';
  if (
    !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss) ||
    !claims.sub ||
    claims.email_verified !== true ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verifiedEmail)
  ) {
    return res.status(401).json({
      error: 'The Google account could not be verified.'
    });
  }

  try {
    let result = await pool.query(
      `SELECT id, full_name, email
       FROM listeners
       WHERE LOWER(email) = @p1`,
      [verifiedEmail]
    );
    let listener = result.recordset[0];

    if (!listener) {
      const googleName = typeof claims.name === 'string' ? claims.name.trim() : '';
      const fullName = (googleName || verifiedEmail.split('@')[0]).slice(0, 120);
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);

      try {
        result = await pool.query(
          `INSERT INTO listeners (full_name, email, password_hash)
           OUTPUT INSERTED.id, INSERTED.full_name, INSERTED.email
           VALUES (@p1, @p2, @p3)`,
          [fullName, verifiedEmail, passwordHash]
        );
        listener = result.recordset[0];
      } catch (error) {
        if (!isDuplicateEmailError(error)) {
          throw error;
        }

        result = await pool.query(
          `SELECT id, full_name, email
           FROM listeners
           WHERE LOWER(email) = @p1`,
          [verifiedEmail]
        );
        listener = result.recordset[0];
        if (!listener) {
          throw error;
        }
      }
    }

    res.json({
      message: 'Google sign-in successful.',
      token: createListenerToken(listener),
      user: {
        id: listener.id,
        fullName: listener.full_name,
        email: listener.email
      }
    });
  } catch (error) {
    console.error('Google listener sign-in error:', error);
    res.status(500).json({
      error: 'Google sign-in failed.'
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

router.get('/favorites', async (req, res) => {
  const listenerId = authenticatedListenerId(req, res);
  if (!listenerId) return;

  try {
    const { recordset } = await pool.query(
      `SELECT favorite_type, favorite_value
       FROM listener_favorites
       WHERE listener_id = @p1`,
      [listenerId]
    );
    res.json({
      showIds: recordset
        .filter(favorite => favorite.favorite_type === 'show')
        .map(favorite => Number(favorite.favorite_value)),
      presenters: recordset
        .filter(favorite => favorite.favorite_type === 'presenter')
        .map(favorite => favorite.favorite_value)
    });
  } catch (error) {
    console.error('Listener favorites load error:', error);
    res.status(500).json({ error: 'Could not load your favourites.' });
  }
});

router.put('/favorites', async (req, res) => {
  const listenerId = authenticatedListenerId(req, res);
  if (!listenerId) return;

  const { showIds, presenters } = req.body || {};
  if (
    !Array.isArray(showIds) ||
    !Array.isArray(presenters) ||
    showIds.length > 100 ||
    presenters.length > 100 ||
    !showIds.every(id => Number.isSafeInteger(Number(id)) && Number(id) > 0) ||
    !presenters.every(name => typeof name === 'string' && name.trim() && name.trim().length <= 200)
  ) {
    return res.status(400).json({ error: 'Choose valid shows and presenters.' });
  }

  const uniqueShowIds = [...new Set(showIds.map(id => Number(id)))];
  const uniquePresenters = [...new Map(
    presenters.map(name => [name.trim().toLocaleLowerCase(), name.trim()])
  ).values()];

  try {
    const [{ recordset: showRows }, { recordset: presenterRows }] = await Promise.all([
      pool.query('SELECT id FROM shows'),
      pool.query('SELECT DISTINCT presenter FROM shows')
    ]);
    const knownShowIds = new Set(showRows.map(show => Number(show.id)));
    const knownPresenters = new Set(
      presenterRows.map(row => row.presenter.trim().toLocaleLowerCase())
    );

    if (
      uniqueShowIds.some(id => !knownShowIds.has(id)) ||
      uniquePresenters.some(name => !knownPresenters.has(name.toLocaleLowerCase()))
    ) {
      return res.status(400).json({ error: 'One or more selected favourites are no longer available.' });
    }

    const favorites = [
      ...uniqueShowIds.map(id => ['show', String(id)]),
      ...uniquePresenters.map(name => ['presenter', name])
    ];

    await pool.transaction(async transaction => {
      await transaction.query(
        'DELETE FROM listener_favorites WHERE listener_id = @p1',
        [listenerId]
      );

      if (favorites.length) {
        const values = [];
        const rows = favorites.map((favorite, index) => {
          values.push(listenerId, favorite[0], favorite[1]);
          const parameter = index * 3;
          return `(@p${parameter + 1}, @p${parameter + 2}, @p${parameter + 3})`;
        });
        await transaction.query(
          `INSERT INTO listener_favorites (listener_id, favorite_type, favorite_value)
           VALUES ${rows.join(', ')}`,
          values
        );
      }
    });

    res.json({ showIds: uniqueShowIds, presenters: uniquePresenters });
  } catch (error) {
    console.error('Listener favorites save error:', error);
    res.status(500).json({ error: 'Could not save your favourites.' });
  }
});

module.exports = router;
