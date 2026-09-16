(() => {
    'use strict';

    const API_BASE = '/api';

    function escapeHtml(value = '') {
        return String(value ?? '').replace(/[&<>'"]/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#039;',
            '"': '&quot;'
        }[character]));
    }

    function mediaUrl(value = '') {
        if (!value) return '';
        if (value.startsWith('/uploads/')) return value;
        if (value.startsWith('http://') || value.startsWith('https://')) return value;
        return `./images/${value}`;
    }

    function formatDate(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return new Intl.DateTimeFormat('en-ZA', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);
    }

    async function getPublishedPosts(type = '') {
        const query = type
            ? `?status=Published&type=${encodeURIComponent(type)}`
            : '?status=Published';

        const response = await fetch(`${API_BASE}/posts${query}`);

        if (!response.ok) {
            throw new Error(`Could not load news (${response.status}).`);
        }

        const posts = await response.json();
        return Array.isArray(posts) ? posts : [];
    }

    function createCard(post) {
        const image = mediaUrl(post.image);
        const date = formatDate(post.published_at || post.created_at);

        return `
            <article class="uagb-post__inner-wrap">
                ${image ? `
                    <div class="uagb-post__image">
                        <a href="./news-story.html?id=${encodeURIComponent(post.id)}"
                           target="_self" rel="bookmark">
                            <img loading="lazy"
                                 src="${escapeHtml(image)}"
                                 alt="${escapeHtml(post.title)}">
                        </a>
                    </div>
                ` : ''}
                <div class="uag-post-grid-wrapper">
                    <h4 class="uagb-post__title uagb-post__text">
                        <a href="./news-story.html?id=${encodeURIComponent(post.id)}"
                           target="_self" rel="bookmark">
                            ${escapeHtml(post.title)}
                        </a>
                    </h4>

                    <div class="uagb-post__text uagb-post-grid-byline">
                        ${date ? `<time class="uagb-post__date">${escapeHtml(date)}</time>` : ''}
                    </div>

                    <div class="uagb-post__text uagb-post__excerpt">
                        <p>${escapeHtml(post.excerpt || '')}</p>
                    </div>

                    <div class="uagb-post__text uagb-post__cta wp-block-button">
                        <a class="wp-block-button__link uagb-text-link"
                           href="./news-story.html?id=${encodeURIComponent(post.id)}">
                            Read More
                        </a>
                    </div>
                </div>
            </article>
        `;
    }

    function renderGrid(grid, posts) {
        if (!grid) return;

        grid.innerHTML = posts.length
            ? posts.map(createCard).join('')
            : `<p class="openmic-news-empty">No published stories in this section yet.</p>`;

        grid.dataset.total = String(posts.length);
    }

    async function render() {
        const path = window.location.pathname.toLowerCase();
        const grids = [...document.querySelectorAll('.uagb-post-grid')];

        try {
            if (path.endsWith('/sports.html')) {
                const posts = await getPublishedPosts('Sport');
                renderGrid(grids[0], posts);
                return;
            }

            if (path.endsWith('/local.html')) {
                const posts = await getPublishedPosts('Local');
                renderGrid(grids[0], posts);
                return;
            }

            if (path.endsWith('/national-news.html')) {
                const posts = await getPublishedPosts('National');
                renderGrid(grids[0], posts);
                return;
            }

            if (path.endsWith('/index.html') || path.endsWith('/')) {
                const [local, national] = await Promise.all([
                    getPublishedPosts('Local'),
                    getPublishedPosts('National')
                ]);

                // Homepage "Your Top stories" contains separate Local and National grids.
                renderGrid(grids[0], local.slice(0, 3));
                renderGrid(grids[1], national.slice(0, 3));
            }
        } catch (error) {
            console.error('OpenMicFM news error:', error);
            grids.forEach(grid => {
                if (grid) {
                    grid.innerHTML = `
                        <p class="openmic-news-empty">
                            News is temporarily unavailable. Please try again shortly.
                        </p>
                    `;
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }

    // ============================================================
    // TOP 10 SONGS FROM DATABASE
    // ============================================================

    async function getTopSongs() {
        const response = await fetch(`${API_BASE}/songs?public=1`);

        if (!response.ok) {
            throw new Error(`Could not load Top 10 songs (${response.status}).`);
        }

        const songs = await response.json();
        return Array.isArray(songs) ? songs : [];
    }

    function createSongCard(song) {
        const image = mediaUrl(song.image);
        const rank = Number(song.rank) || 0;

        return `
            <article class="openmic-song-card">
                <div class="openmic-song-artwork">
                    ${image ? `
                        <img src="${escapeHtml(image)}"
                             loading="lazy"
                             alt="${escapeHtml(song.title)}">
                    ` : `
                        <div class="openmic-song-placeholder">♫</div>
                    `}
                    <span class="openmic-song-rank">${rank}</span>
                </div>
                <div class="openmic-song-info">
                    <h3>${escapeHtml(song.title)}</h3>
                    <p>${escapeHtml(song.artist)}</p>
                </div>
            </article>
        `;
    }

    async function renderTop10Songs() {
        const container = document.getElementById('top10-songs-grid');
        if (!container) return;

        try {
            const songs = (await getTopSongs())
                .sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999))
                .slice(0, 10);

            container.innerHTML = songs.length
                ? songs.map(createSongCard).join('')
                : `<p class="openmic-news-empty">No Top 10 songs are currently available.</p>`;

        } catch (error) {
            console.error('OpenMicFM Top 10 error:', error);
            container.innerHTML = `
                <p class="openmic-news-empty">
                    Music is temporarily unavailable. Please try again shortly.
                </p>
            `;
        }
    }

    renderTop10Songs();

})();
