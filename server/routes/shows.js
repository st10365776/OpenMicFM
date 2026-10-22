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

function formatShow(show) {
  if (!show) return show;
  return {
    ...show,
    days_of_week: JSON.parse(show.days_of_week || '[]'),
    show_dates: JSON.parse(show.show_dates || '[]')
  };
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
  return pool.transaction(async client => {
    await client.query(`
      DECLARE @lock_result INT;
      EXEC @lock_result = sys.sp_getapplock
        @Resource = N'OpenMicFM:show-schedule',
        @LockMode = 'Exclusive',
        @LockOwner = 'Transaction',
        @LockTimeout = 10000;
      IF @lock_result < 0 THROW 50000, 'Could not acquire the schedule lock.', 1;
    `);

    const { recordset: conflicts } = await client.query(
      `WITH requested AS (
         SELECT TRY_CONVERT(date, [value]) AS show_date,
                CHOOSE(
                  ((DATEDIFF(day, CONVERT(date, '19000107'), TRY_CONVERT(date, [value])) % 7 + 7) % 7) + 1,
                  'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
                ) AS day_name
         FROM OPENJSON(@p1)
       )
       SELECT TOP (1) existing.name, existing.start_time, existing.end_time,
              CONVERT(char(10), requested.show_date, 23) AS conflict_date
       FROM shows existing
       JOIN requested
         ON EXISTS (
              SELECT 1 FROM OPENJSON(existing.show_dates) saved
              WHERE TRY_CONVERT(date, saved.[value]) = requested.show_date
            )
         OR (
              NOT EXISTS (SELECT 1 FROM OPENJSON(existing.show_dates))
              AND EXISTS (
                SELECT 1
                FROM OPENJSON(CASE
                  WHEN ISJSON(existing.days_of_week) = 1 AND existing.days_of_week <> N'[]'
                    THEN existing.days_of_week
                  ELSE CONCAT(N'["', existing.day_of_week, N'"]')
                END) saved_day
                WHERE saved_day.[value] = requested.day_name
              )
              AND requested.show_date >= COALESCE(existing.start_date, requested.show_date)
              AND requested.show_date <= COALESCE(existing.end_date, requested.show_date)
            )
       WHERE @p2 < existing.end_time
         AND @p3 > existing.start_time
         AND (@p4 IS NULL OR existing.id <> @p4)
       ORDER BY requested.show_date`,
      [dates, startTime, endTime, excludeId || null]
    );

    if (conflicts[0]) return { conflict: conflicts[0] };
    const result = await client.query(query, values);
    return { rows: result.recordset };
  });
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
    const { recordset } = day
      ? await pool.query(
          `SELECT * FROM shows
           WHERE day_of_week = @p1
              OR EXISTS (
                SELECT 1 FROM OPENJSON(days_of_week) saved_day
                WHERE saved_day.[value] = @p1
              )
           ORDER BY start_time`,
          [day]
        )
      : await pool.query('SELECT * FROM shows ORDER BY day_of_week, start_time');
    res.json(recordset.map(formatShow));
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
              OUTPUT INSERTED.*
              VALUES (@p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p12, @p13, @p14)`,
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
    res.status(201).json(formatShow(rows[0]));
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
      query: `UPDATE shows SET day_of_week=@p1, days_of_week=@p2, show_dates=@p3, start_time=@p4, end_time=@p5,
              start_date=@p6, end_date=@p7, name=@p8, title=@p9, description=@p10, image=@p11,
              presenter=@p12, initials=@p13, tone=@p14, updated_at=SYSUTCDATETIME()
              OUTPUT INSERTED.*
              WHERE id=@p15`,
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
    res.json(formatShow(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update show.' });
  }
});

// DELETE /api/shows/:id  (requires login)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { recordset } = await pool.query('DELETE FROM shows OUTPUT DELETED.name WHERE id = @p1', [req.params.id]);
    if (!recordset.length) return res.status(404).json({ error: 'Show not found.' });
    await recordActivity({
      type: 'show_deleted',
      title: `${recordset[0].name} was deleted`,
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
