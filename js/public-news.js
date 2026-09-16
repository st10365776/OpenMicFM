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
})();
