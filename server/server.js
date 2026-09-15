require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const authRoutes = require('./routes/auth');
const showsRoutes = require('./routes/shows');
const songsRoutes = require('./routes/songs');
const postsRoutes = require('./routes/posts');
const contactRoutes = require('./routes/contact');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const uploadDirectory = path.join(__dirname, 'uploads');

fs.mkdirSync(uploadDirectory, { recursive: true });

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());
app.use('/uploads', express.static(uploadDirectory));
app.use(express.static(path.join(__dirname, '..')));

app.get('/api/health', async (_req, res) => {
	try {
		await pool.query('SELECT 1');
		res.json({ ok: true, database: 'connected' });
	} catch (err) {
		console.error(err);
		res.status(503).json({ ok: false, database: 'unavailable' });
	}
});

app.use('/api/auth', authRoutes);
app.use('/api/shows', showsRoutes);
app.use('/api/songs', songsRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/dashboard', dashboardRoutes);

const PORT = process.env.PORT || 4000;

async function start() {
	await pool.query(`
		ALTER TABLE shows
		ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '',
		ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
		ADD COLUMN IF NOT EXISTS image TEXT NOT NULL DEFAULT '',
		ADD COLUMN IF NOT EXISTS days_of_week TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
	`);
	await pool.query(`
		UPDATE shows
		SET days_of_week = ARRAY[day_of_week]
		WHERE cardinality(days_of_week) = 0
	`);
	await pool.query(`
		ALTER TABLE posts
		ADD COLUMN IF NOT EXISTS image TEXT NOT NULL DEFAULT ''
	`);
	await pool.query(`
		ALTER TABLE songs
		ADD COLUMN IF NOT EXISTS image TEXT NOT NULL DEFAULT ''
	`);
	app.listen(PORT, () => console.log(`OpenMicFM running on port ${PORT}`));
}

start().catch(error => {
	console.error('Unable to prepare the shows table.', error);
	process.exitCode = 1;
});
