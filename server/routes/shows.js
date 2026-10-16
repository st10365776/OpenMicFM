const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { actorName, recordActivity } = require('../utils/activity');

const router = express.Router();
const SCHEDULE_LOCK_ID = 87654321;
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype));
  }
});

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value || '');
}

function normalizeDates(value) {
  if (!Array.isArray(value)) return [];
  const unique = new Set();
  for (const item of value) {
    const date = String(item || '').slice(0, 10);
    if (validDate(date)) unique.add(date);
  }
  return [...unique].sort();
}

// Derived from the picked dates so the public weekday/weekend filters keep working.
function deriveDaysOfWeek(dates) {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return [...new Set(dates.map(date => names[new Date(`${date}T00:00:00Z`).getUTCDay()]))];
}

function validateShow(body, dates, startTime, endTime) {
  if (!dates.length ||
      !validTime(startTime) || !validTime(endTime) || startTime >= endTime ||
      !body.name || !body.presenter || !body.initials) {
    return 'Pick at least one date, a valid time range, show name, presenter, and initials. The end time must be after the start time.';
  }

  return null;
}

async function saveShowWithoutConflict({
  dates,
  startTime,
  endTime,
  excludeId,
  query,
  values
}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [SCHEDULE_LOCK_ID]);

    const { rows: conflicts } = await client.query(
      `WITH requested AS (
         SELECT d::date AS show_date,
                (ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])[EXTRACT(ISODOW FROM d::date)::int] AS day_name
         FROM unnest($1::date[]) AS d
       )
       SELECT existing.name, existing.start_time, existing.end_time,
              requested.show_date::text AS conflict_date
       FROM shows existing
       JOIN requested
         ON requested.show_date = ANY(COALESCE(existing.show_dates, ARRAY[]::date[]))
         OR (
              COALESCE(cardinality(existing.show_dates), 0) = 0
              AND requested.day_name = ANY(COALESCE(NULLIF(existing.days_of_week, ARRAY[]::text[]), ARRAY[existing.day_of_week]))
              AND requested.show_date >= COALESCE(existing.start_date, requested.show_date)
              AND requested.show_date <= COALESCE(existing.end_date, 'infinity'::date)
            )
       WHERE $2::time < existing.end_time
         AND $3::time > existing.start_time
         AND ($4::int IS NULL OR existing.id <> $4)
       ORDER BY requested.show_date
       LIMIT 1`,
      [dates, startTime, endTime, excludeId || null]
    );

    if (conflicts[0]) {
      await client.query('ROLLBACK');
      return { conflict: conflicts[0] };
    }

    const result = await client.query(query, values);
    await client.query('COMMIT');
    return { rows: result.rows };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function conflictMessage(conflict) {
  const date = new Intl.DateTimeFormat('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${conflict.conflict_date}T00:00:00Z`));

  return `There's already a show on ${date} from ${String(conflict.start_time).slice(0, 5)} to ${String(conflict.end_time).slice(0, 5)}: ${conflict.name}. Choose another time or date.`;
}

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

  const dates = normalizeDates(req.body.dates || req.body.show_dates);
  const validationError = validateShow(req.body, dates, startTime, endTime);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const daysOfWeek = deriveDaysOfWeek(dates);

  try {
    const result = await saveShowWithoutConflict({
      dates,
      startTime,
      endTime,
      query: `INSERT INTO shows (day_of_week, days_of_week, show_dates, start_time, end_time, start_date, end_date, name, title, description, image, presenter, initials, tone)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      values: [daysOfWeek[0], daysOfWeek, dates, startTime, endTime, dates[0], dates[dates.length - 1], name, title, description, image, presenter, initials, tone || 'blue']
    });
    if (result.conflict) {
      return res.status(409).json({
        error: conflictMessage(result.conflict),
        conflict_date: result.conflict.conflict_date,
        existing_show: result.conflict.name
      });
    }

    const rows = result.rows;
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

  const dates = normalizeDates(req.body.dates || req.body.show_dates);
  const validationError = validateShow(req.body, dates, startTime, endTime);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const daysOfWeek = deriveDaysOfWeek(dates);

  try {
    const result = await saveShowWithoutConflict({
      dates,
      startTime,
      endTime,
      excludeId: req.params.id,
      query: `UPDATE shows SET day_of_week=$1, days_of_week=$2, show_dates=$3, start_time=$4, end_time=$5,
              start_date=$6, end_date=$7, name=$8, title=$9, description=$10, image=$11,
              presenter=$12, initials=$13, tone=$14, updated_at=now()
              WHERE id=$15 RETURNING *`,
      values: [daysOfWeek[0], daysOfWeek, dates, startTime, endTime, dates[0], dates[dates.length - 1], name, title, description, image, presenter, initials, tone, req.params.id]
    });
    if (result.conflict) {
      return res.status(409).json({
        error: conflictMessage(result.conflict),
        conflict_date: result.conflict.conflict_date,
        existing_show: result.conflict.name
      });
    }

    const rows = result.rows;
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
