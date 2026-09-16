const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { actorName, recordActivity } = require('../utils/activity');

const router = express.Router();
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype));
  }
});

router.post('/image', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Choose a JPG, PNG, WEBP, or GIF image up to 5 MB.' });
  }

  const extension = path.extname(req.file.originalname).toLowerCase() || '.jpg';
  const filename = `${req.file.filename}${extension}`;
  const targetPath = path.join(path.dirname(req.file.path), filename);

  fs.renameSync(req.file.path, targetPath);
  res.status(201).json({ url: `/uploads/${filename}` });
});

router.get('/', async (req, res) => {
  try {
    const publicOnly = req.query.public === '1' || req.query.public === 'true';
    const query = publicOnly
      ? 'SELECT * FROM songs WHERE visible = TRUE ORDER BY rank ASC, id ASC LIMIT 10'
      : 'SELECT * FROM songs ORDER BY rank ASC, id ASC';
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load songs.' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { rank, title, artist, plays, image = '', visible = true } = req.body;
  try {
    const numericRank = Number(rank);
    if (!Number.isInteger(numericRank) || numericRank < 1 || numericRank > 10) {
      return res.status(400).json({ error: 'Rank must be a whole number from 1 to 10.' });
    }
    const existing = await pool.query('SELECT id FROM songs WHERE rank = $1 AND visible = TRUE LIMIT 1', [numericRank]);
    if (existing.rowCount) {
      return res.status(409).json({ error: `Top 10 position ${numericRank} is already in use. Choose another position or edit the existing song.` });
    }
    const { rows } = await pool.query(
      `INSERT INTO songs (rank, title, artist, plays, image, visible) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [numericRank, title, artist, plays || 0, image, visible !== false]
    );
    await recordActivity({
      type: 'song_created',
      title: `${title} was added`,
      description: 'A song was added to the Top 10 list',
      category: 'Music',
      icon: 'yellow',
      actor: actorName(req)
    });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create song.' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { rank, title, artist, plays, image = '', visible = true } = req.body;
  try {
    const numericRank = Number(rank);
    if (!Number.isInteger(numericRank) || numericRank < 1 || numericRank > 10) {
      return res.status(400).json({ error: 'Rank must be a whole number from 1 to 10.' });
    }
    const existing = await pool.query(
      'SELECT id FROM songs WHERE rank = $1 AND visible = TRUE AND id <> $2 LIMIT 1',
      [numericRank, req.params.id]
    );
    if (existing.rowCount) {
      return res.status(409).json({ error: `Top 10 position ${numericRank} is already in use. Choose another position or edit the existing song.` });
    }
    const { rows } = await pool.query(
      `UPDATE songs SET rank=$1, title=$2, artist=$3, plays=$4, image=$5, visible=$6, updated_at=now()
       WHERE id=$7 RETURNING *`,
      [numericRank, title, artist, plays, image, visible !== false, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Song not found.' });
    await recordActivity({
      type: 'song_updated',
      title: `${title} was updated`,
      description: 'The Top 10 playlist was updated',
      category: 'Music',
      icon: 'yellow',
      actor: actorName(req)
    });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update song.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rows, rowCount } = await pool.query('DELETE FROM songs WHERE id = $1 RETURNING title', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Song not found.' });
    await recordActivity({
      type: 'song_deleted',
      title: `${rows[0].title} was deleted`,
      description: 'A song was removed from the Top 10 list',
      category: 'Music',
      icon: 'yellow',
      actor: actorName(req)
    });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete song.' });
  }
});

module.exports = router;
