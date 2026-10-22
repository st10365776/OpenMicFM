require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const authRoutes = require('./routes/auth');
const listenerRoutes = require('./routes/listeners');
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
		await pool.query('SELECT 1 AS ok');
		res.json({ ok: true, database: 'connected' });
	} catch (err) {
		console.error(err);
		res.status(503).json({ ok: false, database: 'unavailable' });
	}
});

app.use('/api/auth', authRoutes);
app.use('/api/listeners', listenerRoutes);
app.use('/api/shows', showsRoutes);
app.use('/api/songs', songsRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/dashboard', dashboardRoutes);

const PORT = process.env.PORT || 4000;

async function start() {
	await pool.initialize();
	app.listen(PORT, () => console.log(`OpenMicFM running on port ${PORT}`));
}

start().catch(error => {
	console.error('Unable to initialize the SQL Server database.', error);
	process.exitCode = 1;
});
