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
      ? 'SELECT TOP (10) * FROM songs WHERE visible = 1 ORDER BY rank ASC, id ASC'
      : 'SELECT * FROM songs ORDER BY rank ASC, id ASC';
    const { recordset } = await pool.query(query);
    res.json(recordset);
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
    const existing = await pool.query('SELECT TOP (1) id FROM songs WHERE rank = @p1 AND visible = 1', [numericRank]);
    if (existing.recordset.length) {
      return res.status(409).json({ error: `Top 10 position ${numericRank} is already in use. Choose another position or edit the existing song.` });
    }
    const { recordset } = await pool.query(
      `INSERT INTO songs (rank, title, artist, plays, image, visible)
       OUTPUT INSERTED.*
       VALUES (@p1, @p2, @p3, @p4, @p5, @p6)`,
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
    res.status(201).json(recordset[0]);
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
      'SELECT TOP (1) id FROM songs WHERE rank = @p1 AND visible = 1 AND id <> @p2',
      [numericRank, req.params.id]
    );
    if (existing.recordset.length) {
      return res.status(409).json({ error: `Top 10 position ${numericRank} is already in use. Choose another position or edit the existing song.` });
    }
    const { recordset } = await pool.query(
      `UPDATE songs SET rank=@p1, title=@p2, artist=@p3, plays=@p4, image=@p5, visible=@p6, updated_at=SYSUTCDATETIME()
       OUTPUT INSERTED.*
       WHERE id=@p7`,
      [numericRank, title, artist, plays, image, visible !== false, req.params.id]
    );
    if (!recordset[0]) return res.status(404).json({ error: 'Song not found.' });
    await recordActivity({
      type: 'song_updated',
      title: `${title} was updated`,
      description: 'The Top 10 playlist was updated',
      category: 'Music',
      icon: 'yellow',
      actor: actorName(req)
    });
    res.json(recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update song.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { recordset } = await pool.query('DELETE FROM songs OUTPUT DELETED.title WHERE id = @p1', [req.params.id]);
    if (!recordset.length) return res.status(404).json({ error: 'Song not found.' });
    await recordActivity({
      type: 'song_deleted',
      title: `${recordset[0].title} was deleted`,
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
