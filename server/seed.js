require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

const shows = [
  ['Mon', '06:00', '09:00', 'Pure gold breakfast', 'Pure gold breakfast', 'Thembalethu Terra Mboza', 'TT', 'blue', 'Start the day with music, conversation and local stories.', 'PSX_20251224_181437-scaled.jpg'],
  ['Mon', '09:00', '12:00', 'KQ Talk', 'KQ Talk', 'Percy Lamani', 'PL', 'yellow', 'Big conversations and the voices shaping the community.', 'PSX_20251224_231011-scaled.jpg'],
  ['Mon', '12:00', '15:00', 'Youth paradise', 'Youth paradise', 'Yonela Gidi', 'YG', 'green', 'A midday space for young ideas, music and culture.', 'PSX_20251224_231752-scaled.jpg'],
  ['Mon', '15:00', '18:00', 'The brunch', 'The brunch', 'Tandazwa Ms Tee Nyawombi', 'TN', 'red', 'Your afternoon soundtrack with the latest local favourites.', 'PSX_20251224_172954-scaled.jpg'],
  ['Mon', '18:00', '20:00', 'Gumba gumba blast music show', 'Gumba gumba blast music show', 'Bra Mellz', 'BM', 'blue', 'A high-energy mix to carry you into the evening.', 'PSX_20251224_230333-scaled.jpg'],
  ['Mon', '20:00', '22:00', '97drive', '97drive', 'Makaziwe "Rich Aunt" Tsako', 'MT', 'yellow', 'Drive-time music, entertainment and listener requests.', 'PSX_20251224_172402-scaled.jpg'],
  ['Sat', '09:00', '12:00', 'ezakwantu', 'ezakwantu', 'Bra Dumza', 'BD', 'green', 'A Saturday celebration of homegrown voices and stories.', 'PSX_20251224_172402-scaled.jpg'],
  ['Sat', '12:00', '15:00', 'TOP 30 chart count down', 'TOP 30 chart count down', 'Siyo Mali', 'SM', 'red', 'The biggest songs on the station, counted down every week.', 'PSX_20251224_231752-scaled.jpg'],
  ['Sat', '15:00', '18:00', 'The source', 'the source', 'Svig Rasi', 'SR', 'blue', 'Fresh music and the stories behind the sound.', 'PSX_20251224_172954-scaled.jpg'],
  ['Sun', '09:00', '12:00', 'sun jazz show', 'sun jazz show', 'Percy Lamani', 'PL', 'yellow', 'A relaxed Sunday morning with timeless jazz selections.', 'PSX_20251224_231254-scaled.jpg'],
  ['Sun', '12:00', '15:00', 'the heartbeat', 'the heartbeat', 'Levis', 'LV', 'red', 'The pulse of the weekend with music and community.', 'PSX_20251224_230333-scaled.jpg']
];

const songs = [
  [1, 'Imithandazo', 'Kabza De Small & DJ Maphorisa', 42],
  [2, 'Mnike', 'Tyler ICU ft. Tumelo_za', 38],
  [3, 'Asibe Happy', 'Kabza De Small, DJ Maphorisa', 35],
  [4, 'Amabala', 'Tyla', 31],
  [5, 'Koo Koo Fun', 'Focalistic', 29],
  [6, 'iPlan', 'Daliwonga', 27],
  [7, 'Imizwa', 'Mthandazo Gatya', 24],
  [8, 'Water', 'Tyla', 22],
  [9, "Ses'fikile", 'Lloyiso', 19],
  [10, 'Saka', 'Busta 929', 16]
];

const posts = [
  ['Local', 'New community garden opens its doors in Mthatha', 'A new growing space is bringing neighbours together.', 'Published'],
  ['Sport', 'School league finals set for Saturday showdown', "The region's young stars are ready for a big finish.", 'Published'],
  ['National', 'Power update: what households need to know', 'The latest service update from across the country.', 'Published'],
  ['Local', 'Five local artists to watch this spring', 'Fresh voices are making waves across the Eastern Cape.', 'Draft'],
  ['Sport', 'Back on top: Chiefs outclass Sekhukhune', 'A confident performance earns a second league win.', 'Published']
];

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Admin user: manager@openmicfm.co.za / openmic2026  (CHANGE THIS PASSWORD AFTER FIRST LOGIN)
    const passwordHash = await bcrypt.hash('openmic2026', 10);
    await client.query(
      `INSERT INTO admin_users (email, password_hash, full_name, initials, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      ['manager@openmicfm.co.za', passwordHash, 'Thando Mbeki', 'TM', 'station_manager']
    );

    for (const s of shows) {
      await client.query(
        `INSERT INTO shows (day_of_week, start_time, end_time, name, title, presenter, initials, tone, description, image)
         SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
         WHERE NOT EXISTS (SELECT 1 FROM shows WHERE day_of_week = $1 AND name = $4)`,
        s
      );
    }

    for (const s of songs) {
      await client.query(
        `INSERT INTO songs (rank, title, artist, plays) VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        s
      );
    }

    for (const [type, title, excerpt, status] of posts) {
      await client.query(
        `INSERT INTO posts (type, title, slug, excerpt, status, published_at)
         VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 = 'Published' THEN now() ELSE NULL END)
         ON CONFLICT (slug) DO NOTHING`,
        [type, title, slugify(title), excerpt, status]
      );
    }

    await client.query('COMMIT');
    console.log('Seed complete. Admin login -> manager@openmicfm.co.za / openmic2026');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
