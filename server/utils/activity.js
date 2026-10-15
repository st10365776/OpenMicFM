const pool = require('../db');

async function recordActivity({ type, title, description = '', category, icon = 'blue', actor }) {
  await pool.query(
    `INSERT INTO admin_activity
       (activity_type, title, description, category, icon, actor_name)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [type, title, description, category, icon, actor || 'Station manager']
  );
}

function actorName(request) {
  return request.user?.fullName || request.user?.email || 'Station manager';
}

module.exports = { actorName, recordActivity };
