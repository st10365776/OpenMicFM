const express = require('express');
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
  const sourcePath = req.file.path;
  const targetPath = path.join(path.dirname(sourcePath), filename);

  require('fs').renameSync(sourcePath, targetPath);
  res.status(201).json({ url: `/uploads/${filename}` });
});

// GET /api/shows?day=Thu  (day is optional)
router.get('/', async (req, res) => {
  const { day } = req.query;
  try {
    const { rows } = day
      ? await pool.query(
          'SELECT * FROM shows WHERE day_of_week = $1 OR $1 = ANY(days_of_week) ORDER BY start_time',
          [day]
        )
      : await pool.query('SELECT * FROM shows ORDER BY day_of_week, start_time');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load shows.' });
  }
});

// POST /api/shows  (requires login)
router.post('/', requireAuth, async (req, res) => {
  const {
    dayOfWeek = req.body.day_of_week,
    daysOfWeek = req.body.days_of_week || (dayOfWeek ? [dayOfWeek] : []),
    startTime = req.body.start_time,
    endTime = req.body.end_time,
    name,
    title = name,
    description = '',
    image = '',
    presenter,
    initials,
    tone
  } = req.body;

  const selectedDays = [...new Set(daysOfWeek.filter(Boolean))];
  if (!selectedDays.length || !startTime || !endTime || !name || !presenter || !initials) {
    return res.status(400).json({ error: 'Day, times, name, presenter, and initials are required.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO shows (day_of_week, days_of_week, start_time, end_time, name, title, description, image, presenter, initials, tone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [selectedDays[0], selectedDays, startTime, endTime, name, title, description, image, presenter, initials, tone || 'blue']
    );
    await recordActivity({
      type: 'show_created',
      title: `${name} was added`,
      description: 'A show was added to the schedule',
      category: 'Schedule',
      icon: 'blue',
      actor: actorName(req)
    });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create show.' });
  }
});

// PUT /api/shows/:id  (requires login)
router.put('/:id', requireAuth, async (req, res) => {
  const {
    dayOfWeek = req.body.day_of_week,
    daysOfWeek = req.body.days_of_week || (dayOfWeek ? [dayOfWeek] : []),
    startTime = req.body.start_time,
    endTime = req.body.end_time,
    name,
    title = name,
    description = '',
    image = '',
    presenter,
    initials,
    tone
  } = req.body;

  const selectedDays = [...new Set(daysOfWeek.filter(Boolean))];
  if (!selectedDays.length || !startTime || !endTime || !name || !presenter || !initials) {
    return res.status(400).json({ error: 'Day, times, name, presenter, and initials are required.' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE shows SET day_of_week=$1, days_of_week=$2, start_time=$3, end_time=$4, name=$5,
       title=$6, description=$7, image=$8, presenter=$9, initials=$10,
       tone=$11, updated_at=now() WHERE id=$12 RETURNING *`,
      [selectedDays[0], selectedDays, startTime, endTime, name, title, description, image, presenter, initials, tone, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Show not found.' });
    await recordActivity({
      type: 'show_updated',
      title: `${name} was updated`,
      description: 'The presenter schedule was updated',
      category: 'Schedule',
      icon: 'blue',
      actor: actorName(req)
    });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update show.' });
  }
});

// DELETE /api/shows/:id  (requires login)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rows, rowCount } = await pool.query('DELETE FROM shows WHERE id = $1 RETURNING name', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Show not found.' });
    await recordActivity({
      type: 'show_deleted',
      title: `${rows[0].name} was deleted`,
      description: 'A show was removed from the schedule',
      category: 'Schedule',
      icon: 'blue',
      actor: actorName(req)
    });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete show.' });
  }
});

module.exports = router;
