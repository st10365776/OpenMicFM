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

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

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

// GET /api/posts?status=Published&type=Sport
router.get('/', async (req, res) => {
  const { status, type } = req.query;
  const conditions = [];
  const values = [];

  if (status) { values.push(status); conditions.push(`status = $${values.length}`); }
  if (type) { values.push(type); conditions.push(`type = $${values.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `SELECT * FROM posts ${where} ORDER BY created_at DESC`,
      values
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load posts.' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { type, title, excerpt, body, status, image = '' } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO posts (type, title, slug, excerpt, body, image, status, author_id, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        type,
        title,
        slugify(title),
        excerpt || null,
        body || null,
        image,
        status || 'Draft',
        req.user.id,
        status === 'Published' ? new Date() : null
      ]
    );
    await recordActivity({
      type: status === 'Published' ? 'post_published' : 'post_created',
      title: `${title} was ${status === 'Published' ? 'published' : 'saved'}`,
      description: 'A newsroom story was updated',
      category: type,
      icon: type === 'Sport' ? 'green' : 'blue',
      actor: actorName(req)
    });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create post.' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { type, title, excerpt, body, status, image = '' } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE posts SET type=$1, title=$2, slug=$3, excerpt=$4, body=$5, image=$6, status=$7,
       published_at = CASE WHEN $7 = 'Published' AND published_at IS NULL THEN now() ELSE published_at END,
       updated_at = now()
       WHERE id=$8 RETURNING *`,
      [type, title, slugify(title), excerpt, body, image, status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Post not found.' });
    await recordActivity({
      type: status === 'Published' ? 'post_published' : 'post_updated',
      title: `${title} was updated`,
      description: 'A newsroom story was edited',
      category: type,
      icon: type === 'Sport' ? 'green' : 'blue',
      actor: actorName(req)
    });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update post.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rows, rowCount } = await pool.query('DELETE FROM posts WHERE id = $1 RETURNING title, type', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Post not found.' });
    await recordActivity({
      type: 'post_deleted',
      title: `${rows[0].title} was deleted`,
      description: 'A newsroom story was removed',
      category: rows[0].type,
      icon: rows[0].type === 'Sport' ? 'green' : 'blue',
      actor: actorName(req)
    });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete post.' });
  }
});

module.exports = router;
