const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const [metrics, activity, user] = await Promise.all([
      pool.query(
        `SELECT metric_key, metric_value, change_value, change_text
         FROM dashboard_metrics`
      ),
      pool.query(
        `SELECT id, activity_type, title, description, category, icon, actor_name, created_at
         FROM admin_activity
         ORDER BY created_at DESC
         LIMIT 10`
      ),
      pool.query(
        `SELECT full_name, initials, email, role
         FROM admin_users
         WHERE id = $1`,
        [req.user.id]
      )
    ]);

    res.json({
      metrics: metrics.rows,
      activity: activity.rows,
      user: user.rows[0] || null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load dashboard data.' });
  }
});

module.exports = router;
