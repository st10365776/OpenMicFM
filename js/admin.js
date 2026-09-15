(function () {
    'use strict';

    // ============================================================
    // CONFIGURATION
    // ============================================================

    const API_BASE = 'http://localhost:4000/api';
    const AUTH_KEY = 'openmicfm-token';

    const DEFAULT_DATA = {
        shows: [
            {
                time: '05:00 – 09:00',
                name: 'Sunrise Mthatha',
                presenter: 'Lwazi Ndlovu',
                initials: 'LN',
                tone: 'blue'
            },
            {
                time: '09:00 – 12:00',
                name: 'The Mid-Morning Mix',
                presenter: 'Thando Mbeki',
                initials: 'TM',
                tone: 'yellow'
            },
            {
                time: '12:00 – 15:00',
                name: 'Lunch with Lungile',
                presenter: 'Lungile Maseko',
                initials: 'LM',
                tone: 'green'
            },
            {
                time: '15:00 – 18:00',
                name: 'Drive Home',
                presenter: 'Siyanda Gqoboka',
                initials: 'SG',
                tone: 'red'
            },
            {
                time: '18:00 – 20:00',
                name: 'The Evening Exchange',
                presenter: 'Anele Radebe',
                initials: 'AR',
                tone: 'blue'
            },
            {
                time: '20:00 – 22:00',
                name: 'Open Mic Sessions',
                presenter: 'Guest rotation',
                initials: 'GR',
                tone: 'yellow'
            }
        ],

        songs: [
            {
                title: 'Imithandazo',
                artist: 'Kabza De Small & DJ Maphorisa',
                plays: 42
            },
            {
                title: 'Mnike',
                artist: 'Tyler ICU ft. Tumelo_za',
                plays: 38
            },
            {
                title: 'Asibe Happy',
                artist: 'Kabza De Small, DJ Maphorisa',
                plays: 35
            },
            {
                title: 'Amabala',
                artist: 'Tyla',
                plays: 31
            },
            {
                title: 'Koo Koo Fun',
                artist: 'Focalistic',
                plays: 29
            },
            {
                title: 'iPlan',
                artist: 'Daliwonga',
                plays: 27
            },
            {
                title: 'Imizwa',
                artist: 'Mthandazo Gatya',
                plays: 24
            },
            {
                title: 'Water',
                artist: 'Tyla',
                plays: 22
            },
            {
                title: 'Ses’fikile',
                artist: 'Lloyiso',
                plays: 19
            },
            {
                title: 'Saka',
                artist: 'Busta 929',
                plays: 16
            }
        ],

        posts: [
            {
                type: 'Local',
                title: 'New community garden opens its doors in Mthatha',
                excerpt: 'A new growing space is bringing neighbours together.',
                date: 'Today, 09:42',
                status: 'Published'
            },
            {
                type: 'Sport',
                title: 'School league finals set for Saturday showdown',
                excerpt: 'The region’s young stars are ready for a big finish.',
                date: 'Yesterday',
                status: 'Published'
            },
            {
                type: 'National',
                title: 'Power update: what households need to know',
                excerpt: 'The latest service update from across the country.',
                date: '01 Sep 2026',
                status: 'Published'
            },
            {
                type: 'Local',
                title: 'Five local artists to watch this spring',
                excerpt: 'Fresh voices are making waves across the Eastern Cape.',
                date: '30 Aug 2026',
                status: 'Draft'
            },
            {
                type: 'Sport',
                title: 'Back on top: Chiefs outclass Sekhukhune',
                excerpt: 'A confident performance earns a second league win.',
                date: '29 Aug 2026',
                status: 'Published'
            }
        ]
    };


    // ============================================================
    // APPLICATION STATE
    // ============================================================

    let data = {
        shows: [],
        songs: [],
        posts: [],
        metrics: [],
        activity: [],
        user: null
    };
    let activeModal = '';
    let editingItem = null;


    // ============================================================
    // DOM ELEMENTS
    // ============================================================

    const elements = {
        loginView: document.getElementById('login-view'),
        dashboard: document.getElementById('dashboard-view'),

        loginForm: document.getElementById('login-form'),
        loginEmail: document.getElementById('login-email'),
        loginPassword: document.getElementById('login-password'),
        loginMessage: document.getElementById('login-message'),

        logoutButton: document.getElementById('logout-button'),

        modal: document.getElementById('modal-backdrop'),
        modalFields: document.getElementById('modal-fields'),
        modalTitle: document.getElementById('modal-title'),
        modalClose: document.getElementById('modal-close'),
        itemForm: document.getElementById('item-form'),

        statShows: document.getElementById('stat-shows'),
        statTracks: document.getElementById('stat-tracks'),
        statPosts: document.getElementById('stat-posts'),
        weeklyReach: document.querySelector('.stat-card:nth-child(4) strong'),
        weeklyChange: document.querySelector('.stat-card:nth-child(4) .positive'),
        activityList: document.querySelector('.activity-list'),
        overviewScheduleTitle: document.querySelector('.schedule-preview h3'),
        profileName: document.querySelector('.profile strong'),
        profileInitials: document.querySelector('.profile > span'),

        scheduleList: document.getElementById('schedule-list'),
        overviewSchedule: document.getElementById('overview-schedule'),
        headerKickers: document.querySelectorAll('.header-kicker'),
        dayTabs: document.querySelectorAll('.day-tab'),
        toolbarNote: document.querySelector('.toolbar-note'),

        musicList: document.getElementById('music-list'),
        newsList: document.getElementById('news-list'),
        allCount: document.getElementById('all-count'),

        pageHeading: document.getElementById('page-heading'),

        addShowButton: document.getElementById('add-show-button'),
        addSongButton: document.getElementById('add-song-button'),
        addPostButton: document.getElementById('add-post-button')
    };


    // ============================================================
    // STORAGE
    // ============================================================

    function getAuthToken() {
        return sessionStorage.getItem(AUTH_KEY);
    }

    async function apiRequest(path, options = {}) {
        const headers = { ...(options.headers || {}) };

        if (!(options.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }
        const token = getAuthToken();

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers,
            body: options.body && !(options.body instanceof FormData) && typeof options.body !== 'string'
                ? JSON.stringify(options.body)
                : options.body
        });

        if (!response.ok) {
            let message = `Request failed (${response.status})`;

            try {
                const error = await response.json();
                message = error.message || error.error || message;
            } catch (error) {}

            throw new Error(message);
        }

        return response.status === 204 ? null : response.json();
    }

    function normalizeShow(show) {
        if (show.time) {
            return show;
        }

        return {
            ...show,
            time: `${String(show.start_time || '').slice(0, 5)} – ${String(show.end_time || '').slice(0, 5)}`
        };
    }

    async function loadData() {
        const [shows, songs, posts, dashboard] = await Promise.all([
            apiRequest('/shows'),
            apiRequest('/songs'),
            apiRequest('/posts'),
            apiRequest('/dashboard')
        ]);

        data = {
            shows: shows.map(normalizeShow),
            songs,
            posts,
            metrics: dashboard.metrics || [],
            activity: dashboard.activity || [],
            user: dashboard.user || null
        };
    }


    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================

    function escapeHtml(value) {
        return String(value).replace(/[&<>'"]/g, character => {
            const entities = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#039;',
                '"': '&quot;'
            };

            return entities[character];
        });
    }

    function mediaUrl(value) {
        if (!value) return '';
        if (value.startsWith('/uploads/')) return `http://localhost:4000${value}`;
        return value.startsWith('http') ? value : `../images/${value}`;
    }

    function getInitials(name) {
        return name
            .split(' ')
            .filter(Boolean)
            .map(part => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
    }


    // ============================================================
    // AUTHENTICATION
    // ============================================================

    function isAuthenticated() {
        return Boolean(getAuthToken());
    }

    function showDashboard() {
        if (elements.loginView) elements.loginView.hidden = true;
        if (elements.dashboard) elements.dashboard.hidden = false;

        renderAll();
    }

    function showLogin() {
        if (elements.dashboard) elements.dashboard.hidden = true;
        if (elements.loginView) elements.loginView.hidden = false;
    }

    async function handleLogin(event) {
        event.preventDefault();

        const email = elements.loginEmail.value.trim();
        const password = elements.loginPassword.value;

        try {
            const result = await apiRequest('/auth/login', {
                method: 'POST',
                body: { email, password }
            });

            if (!result.token) {
                throw new Error('The login response did not include a token.');
            }

            sessionStorage.setItem(AUTH_KEY, result.token);
            await loadData();
            elements.loginMessage.textContent = '';
        } catch (error) {
            elements.loginMessage.textContent =
                error.message || 'Unable to sign in. Please try again.';

            return;
        }

        if (elements.dashboard) {
            showDashboard();
        } else {
            window.location.href = 'overview.html';
        }
    }

    function handleLogout() {
        sessionStorage.removeItem(AUTH_KEY);
        if (elements.loginView) {
            showLogin();
        } else {
            window.location.href = 'login.html';
        }
    }


    // ============================================================
    // RENDERING
    // ============================================================

    function renderAll() {
        renderStats();
        renderSchedule();
        renderMusic();
        renderPosts();
        renderDashboardDetails();
    }

    function renderStats() {
        if (elements.statShows) elements.statShows.textContent = data.shows.length;
        if (elements.statTracks) elements.statTracks.textContent = data.songs.length;
        if (elements.statPosts) {
            elements.statPosts.textContent = data.posts.filter(post => post.status === 'Published').length;
        }

        const reach = data.metrics.find(metric => metric.metric_key === 'weekly_reach');
        if (reach && elements.weeklyReach) {
            elements.weeklyReach.textContent = `${(Number(reach.metric_value) / 1000).toFixed(1)}k`;
        }
        if (reach && elements.weeklyChange) {
            elements.weeklyChange.innerHTML = `↑ ${escapeHtml(reach.change_value)}% <span>${escapeHtml(reach.change_text)}</span>`;
        }
    }

    function renderDashboardDetails() {
        if (data.user) {
            const fullName = data.user.full_name || 'Station manager';
            if (elements.profileName) elements.profileName.textContent = fullName;
            if (elements.profileInitials) elements.profileInitials.textContent = data.user.initials || getInitials(fullName);
        }

        updatePageHeading(document.querySelector('.content-section.active')?.dataset.panel || 'overview');

        if (elements.activityList) {
            elements.activityList.innerHTML = data.activity.length
                ? data.activity.map(activity => `
                    <div>
                        <span class="activity-mark ${escapeHtml(activity.icon)}">${activity.icon === 'yellow' ? '♫' : activity.icon === 'green' ? '✓' : '◷'}</span>
                        <p>
                            <strong>${escapeHtml(activity.title)}</strong>
                            <small>by ${escapeHtml(activity.actor_name)} · ${formatRelativeTime(activity.created_at)}</small>
                        </p>
                        <span class="activity-tag">${escapeHtml(activity.category)}</span>
                    </div>
                `).join('')
                : '<p class="muted">No recent activity.</p>';
        }
    }

    function formatRelativeTime(value) {
        const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
        if (elapsedMinutes < 1) return 'just now';
        if (elapsedMinutes < 60) return `${elapsedMinutes} minute${elapsedMinutes === 1 ? '' : 's'} ago`;
        const elapsedHours = Math.floor(elapsedMinutes / 60);
        if (elapsedHours < 24) return `${elapsedHours} hour${elapsedHours === 1 ? '' : 's'} ago`;
        const elapsedDays = Math.floor(elapsedHours / 24);
        return `${elapsedDays} day${elapsedDays === 1 ? '' : 's'} ago`;
    }

    function renderSchedule() {
        renderDateContext();
        renderFullSchedule();
        renderOverviewSchedule();
    }

    function renderDateContext() {
        const today = new Date();
        const dateFormatter = new Intl.DateTimeFormat('en-ZA', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        elements.headerKickers.forEach(kicker => {
            kicker.textContent = dateFormatter.format(today).toUpperCase();
        });

        elements.dayTabs.forEach((tab, index) => {
            const date = new Date(today);
            date.setDate(today.getDate() + index);
            const dayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
                .format(date)
                .toUpperCase();
            const dayCode = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);

            tab.firstChild.nodeValue = `${dayLabel} `;
            tab.querySelector('strong').textContent = String(date.getDate()).padStart(2, '0');
            tab.dataset.day = dayCode;
        });
    }

    function renderFullSchedule() {
        if (!elements.scheduleList) return;

        renderDateContext();

        if (elements.toolbarNote && data.shows.length) {
            const times = data.shows
                .map(show => [show.start_time, show.end_time])
                .flat()
                .sort();
            elements.toolbarNote.textContent = `${data.shows.length} shows · ${times[0].slice(0, 5)} – ${times[times.length - 1].slice(0, 5)}`;
        }

        const html = data.shows
            .map((show, index) => `
                <div class="schedule-item">

                    <time>
                        ${escapeHtml(show.time)}
                    </time>

                    <div class="presenter">

                        <span class="presenter-avatar">
                            ${escapeHtml(show.initials)}
                        </span>

                        <div>
                            <strong>
                                ${escapeHtml(show.name)}
                            </strong>

                            <small>
                                ${escapeHtml(show.presenter)}
                            </small>
                        </div>

                    </div>

                    <span class="status-pill">
                        Confirmed
                    </span>

                    <div class="action-menu">
                        <button class="row-actions" type="button" aria-label="Show actions">···</button>
                        <div class="action-menu-options">
                            <button type="button" data-edit-type="show" data-edit-index="${index}">Edit</button>
                            <button type="button" data-delete-show="${index}">Delete</button>
                        </div>
                    </div>

                </div>
            `)
            .join('');

        elements.scheduleList.innerHTML = html;
    }

    function renderOverviewSchedule() {
        if (!elements.overviewSchedule) return;

        if (elements.overviewScheduleTitle) {
            elements.overviewScheduleTitle.textContent = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()) + ' line-up';
        }

        const html = data.shows
            .slice(0, 4)
            .map(show => `
                <div class="schedule-row">

                    <time>
                        ${escapeHtml(show.time.split(' ')[0])}
                    </time>

                    <div>
                        <strong>
                            ${escapeHtml(show.name)}
                        </strong>

                        <small>
                            ${escapeHtml(show.presenter)}
                        </small>
                    </div>

                    <span class="status-pill">
                        On air
                    </span>

                </div>
            `)
            .join('');

        elements.overviewSchedule.innerHTML = html;
    }

    function renderMusic() {
        if (!elements.musicList) return;

        const html = data.songs
            .map((song, index) => `
                <div class="music-item">

                    <span class="rank">
                        ${String(index + 1).padStart(2, '0')}
                    </span>

                    <div class="track">
                            ${song.image ? `<img class="song-artwork" src="${escapeHtml(mediaUrl(song.image))}" alt="">` : ''}
                            <div>
                                <strong>
                                    ${escapeHtml(song.title)}
                                </strong>

                                <small>
                                    Now in rotation
                                </small>
                            </div>

                    </div>

                    <span>
                        ${escapeHtml(song.artist)}
                    </span>

                    <span class="plays">
                        ${escapeHtml(song.plays)} plays
                    </span>

                    <div class="action-menu">
                        <button class="row-actions" type="button" aria-label="Song actions">···</button>
                        <div class="action-menu-options">
                            <button type="button" data-edit-type="song" data-edit-index="${index}">Edit</button>
                            <button type="button" data-delete-song="${index}">Delete</button>
                        </div>
                    </div>

                </div>
            `)
            .join('');

        elements.musicList.innerHTML = html;
    }

    function renderPosts(filter = 'all') {
        if (!elements.newsList) return;

        const filteredPosts = data.posts.filter(post => {
            if (!filter || filter === 'all') {
                return true;
            }

            if (filter === 'draft') {
                return post.status === 'Draft';
            }

            return post.type.toLowerCase() === filter;
        });

        const html = filteredPosts
            .map(post => {
                const originalIndex = data.posts.indexOf(post);

                return `
                    <article class="news-card">

                        <div class="news-card-top">

                            <span class="news-type">
                                ${escapeHtml(post.type)}
                            </span>

                            <span class="${post.status === 'Draft' ? 'draft-badge' : ''}">
                                ${escapeHtml(post.status)}
                            </span>

                        </div>

                        <h3>
                            ${escapeHtml(post.title)}
                        </h3>

                        <p>
                            ${escapeHtml(post.excerpt)}
                        </p>

                        <footer>

                            <span>
                                ${escapeHtml(post.date || post.published_at || post.created_at || '')}
                            </span>

                            <div class="action-menu">
                                <button class="row-actions" type="button" aria-label="News actions">···</button>
                                <div class="action-menu-options">
                                    <button type="button" data-edit-type="post" data-edit-index="${originalIndex}">Edit</button>
                                    <button type="button" data-delete-post="${originalIndex}">Delete</button>
                                </div>
                            </div>

                        </footer>

                    </article>
                `;
            })
            .join('');

        elements.newsList.innerHTML = html;

        if (elements.allCount) elements.allCount.textContent = data.posts.length;
    }


    // ============================================================
    // MODAL
    // ============================================================

    function getShowFields() {
        return `
            <div class="form-field">
                <label for="field-day">
                    Day
                </label>

                <div class="day-checkboxes" id="field-days">
                    ${[
                        ['Mon', 'Monday'], ['Tue', 'Tuesday'], ['Wed', 'Wednesday'],
                        ['Thu', 'Thursday'], ['Fri', 'Friday'], ['Sat', 'Saturday'], ['Sun', 'Sunday']
                    ].map(([value, label]) => `
                        <label><input type="checkbox" name="show-days" value="${value}"> ${label}</label>
                    `).join('')}
                </div>
            </div>

            <div class="form-field">
                <label for="field-time">
                    Time slot
                </label>

                <input
                    id="field-time"
                    required
                    placeholder="09:00 – 12:00"
                >
            </div>

            <div class="form-field">
                <label for="field-name">
                    Card name
                </label>

                <input
                    id="field-name"
                    required
                    placeholder="The Mid-Morning Mix"
                >
            </div>

            <div class="form-field">
                <label for="field-title">
                    Show title
                </label>

                <input
                    id="field-title"
                    required
                    placeholder="The Mid-Morning Mix"
                >
            </div>

            <div class="form-field full">
                <label for="field-description">
                    Description
                </label>

                <textarea
                    id="field-description"
                    required
                    placeholder="A short description for the show..."
                ></textarea>
            </div>

            <div class="form-field full">
                <label for="field-image">
                    Show image
                </label>

                <input
                    id="field-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    placeholder="show-image.jpg"
                >
            </div>

            <div class="form-field full">
                <label for="field-presenter">
                    Presenter
                </label>

                <input
                    id="field-presenter"
                    required
                    placeholder="Presenter name"
                >
            </div>
        `;
    }

    function getSongFields() {
        return `
            <div class="form-field">

                <label for="field-title">
                    Song title
                </label>

                <input
                    id="field-title"
                    required
                    placeholder="Song title"
                >

            </div>

            <div class="form-field">

                <label for="field-artist">
                    Artist
                </label>

                <input
                    id="field-artist"
                    required
                    placeholder="Artist name"
                >

            </div>

            <div class="form-field">

                <label for="field-song-image">
                    Song artwork
                </label>

                <input
                    id="field-song-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                >

            </div>

            <div class="form-field">

                <label for="field-plays">
                    Current plays
                </label>

                <input
                    id="field-plays"
                    type="number"
                    min="0"
                    value="0"
                    required
                >

            </div>
        `;
    }

    function getPostFields() {
        return `
            <div class="form-field">

                <label for="field-type">
                    Section
                </label>

                <select id="field-type">
                    <option>Local</option>
                    <option>National</option>
                    <option>Sport</option>
                </select>

            </div>

            <div class="form-field">

                <label for="field-status">
                    Status
                </label>

                <select id="field-status">
                    <option>Published</option>
                    <option>Draft</option>
                </select>

            </div>

            <div class="form-field full">

                <label for="field-title">
                    Headline
                </label>

                <input
                    id="field-title"
                    required
                    placeholder="Story headline"
                >

            </div>

            <div class="form-field full">

                <label for="field-excerpt">
                    Short summary
                </label>

                <textarea
                    id="field-excerpt"
                    required
                    placeholder="A short description for the newsroom..."
                ></textarea>

            </div>

            <div class="form-field full">
                <label for="field-post-image">
                    Story image
                </label>

                <input
                    id="field-post-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                >
            </div>

            <div class="form-field full">
                <label>Story content</label>
                <div class="editor-toolbar" role="toolbar" aria-label="Story formatting">
                    <button type="button" data-editor-command="bold"><strong>B</strong></button>
                    <button type="button" data-editor-command="italic"><em>I</em></button>
                    <button type="button" data-editor-command="underline"><u>U</u></button>
                    <button type="button" data-editor-command="formatBlock" data-editor-value="&lt;h2&gt;">H2</button>
                    <button type="button" data-editor-command="insertUnorderedList">List</button>
                    <button type="button" data-editor-command="insertOrderedList">1. List</button>
                    <button type="button" data-editor-command="createLink">Link</button>
                </div>
                <div id="field-body" class="rich-editor" contenteditable="true" role="textbox" aria-multiline="true"></div>
            </div>
        `;
    }

    function getModalFields(type) {
        switch (type) {
            case 'show':
                return getShowFields();

            case 'song':
                return getSongFields();

            case 'post':
                return getPostFields();

            default:
                return '';
        }
    }

    function getModalTitle(type) {
        switch (type) {
            case 'show':
                return 'Add a show';

            case 'song':
                return 'Add a song';

            case 'post':
                return 'New story';

            default:
                return '';
        }
    }

    function openModal(type) {
        activeModal = type;
        editingItem = null;

        elements.modalTitle.textContent =
            getModalTitle(type);

        elements.modalFields.innerHTML =
            getModalFields(type);

        elements.modal.hidden = false;

        const firstField =
            elements.modalFields.querySelector('input, select, textarea');

        if (firstField) {
            firstField.focus();
        }
    }

    function openEditModal(type, item) {
        activeModal = type;
        editingItem = item;
        elements.modalTitle.textContent = `Edit ${type === 'post' ? 'story' : type}`;
        elements.modalFields.innerHTML = getModalFields(type);
        elements.modal.hidden = false;

        if (type === 'show') {
            const days = item.days_of_week || [item.day_of_week];
            document.querySelectorAll('input[name="show-days"]').forEach(field => {
                field.checked = days.includes(field.value);
            });
            document.getElementById('field-time').value = item.time || `${item.start_time} – ${item.end_time}`;
            document.getElementById('field-name').value = item.name || '';
            document.getElementById('field-title').value = item.title || item.name || '';
            document.getElementById('field-description').value = item.description || '';
            document.getElementById('field-presenter').value = item.presenter || '';
        }

        if (type === 'song') {
            document.getElementById('field-title').value = item.title || '';
            document.getElementById('field-artist').value = item.artist || '';
            document.getElementById('field-plays').value = item.plays || 0;
        }

        if (type === 'post') {
            document.getElementById('field-type').value = item.type || 'Local';
            document.getElementById('field-status').value = item.status || 'Draft';
            document.getElementById('field-title').value = item.title || '';
            document.getElementById('field-excerpt').value = item.excerpt || '';
            document.getElementById('field-body').innerHTML = item.body || '';
        }

        const firstField = elements.modalFields.querySelector('input, select, textarea');
        if (firstField) firstField.focus();
    }

    function closeModal() {
        elements.modal.hidden = true;
        activeModal = '';
        editingItem = null;
    }


    // ============================================================
    // FORM HANDLING
    // ============================================================

    function getFieldValue(id) {
        const field = document.getElementById(id);

        return field
            ? field.value.trim()
            : '';
    }

    function getCheckedValues(name) {
        return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(field => field.value);
    }

    function getEditorValue() {
        const editor = document.getElementById('field-body');
        return editor ? editor.innerHTML.trim() : '';
    }

    async function handleItemSubmit(event) {
        event.preventDefault();

        try {
            switch (activeModal) {
                case 'show':
                    await saveShow();
                    break;

                case 'song':
                    await saveSong();
                    break;

                case 'post':
                    await savePost();
                    break;
            }

            await loadData();
            renderAll();
            closeModal();
        } catch (error) {
            console.error('Failed to save dashboard item:', error);
        }
    }

    async function saveShow() {
        const presenter = getFieldValue('field-presenter');
        const daysOfWeek = getCheckedValues('show-days');
        const imageField = document.getElementById('field-image');
        let image = editingItem?.image || '';

        if (imageField && imageField.files[0]) {
            const upload = new FormData();
            upload.append('image', imageField.files[0]);
            const result = await apiRequest('/shows/image', {
                method: 'POST',
                body: upload
            });
            image = result.url;
        }

        const [startTime, endTime] = getFieldValue('field-time').split(/\s*[–-]\s*/);

        await apiRequest(editingItem ? `/shows/${editingItem.id}` : '/shows', {
            method: editingItem ? 'PUT' : 'POST',
            body: {
                day_of_week: daysOfWeek[0],
                days_of_week: daysOfWeek,
                start_time: startTime,
                end_time: endTime,
                name: getFieldValue('field-name'),
                title: getFieldValue('field-title'),
                description: getFieldValue('field-description'),
                image,
                presenter,
                initials: getInitials(presenter),
                tone: 'blue'
            }
        });
    }

    async function saveSong() {
        const imageField = document.getElementById('field-song-image');
        let image = editingItem?.image || '';

        if (imageField && imageField.files[0]) {
            const upload = new FormData();
            upload.append('image', imageField.files[0]);
            const result = await apiRequest('/songs/image', {
                method: 'POST',
                body: upload
            });
            image = result.url;
        }

        await apiRequest(editingItem ? `/songs/${editingItem.id}` : '/songs', {
            method: editingItem ? 'PUT' : 'POST',
            body: {
                rank: editingItem?.rank || data.songs.length + 1,
                title: getFieldValue('field-title'),
                artist: getFieldValue('field-artist'),
                plays: Number(getFieldValue('field-plays')) || 0,
                image
            }
        });
    }

    async function savePost() {
        const imageField = document.getElementById('field-post-image');
        let image = editingItem?.image || '';

        if (imageField && imageField.files[0]) {
            const upload = new FormData();
            upload.append('image', imageField.files[0]);
            const result = await apiRequest('/posts/image', {
                method: 'POST',
                body: upload
            });
            image = result.url;
        }

        await apiRequest(editingItem ? `/posts/${editingItem.id}` : '/posts', {
            method: editingItem ? 'PUT' : 'POST',
            body: {
                type: getFieldValue('field-type'),
                status: getFieldValue('field-status'),
                title: getFieldValue('field-title'),
                excerpt: getFieldValue('field-excerpt'),
                body: getEditorValue(),
                image
            }
        });
    }


    // ============================================================
    // DELETE ACTIONS
    // ============================================================

    async function deleteShow(index) {
        await apiRequest(`/shows/${data.shows[index].id}`, { method: 'DELETE' });
        await loadData();
        renderAll();
    }

    async function deleteSong(index) {
        await apiRequest(`/songs/${data.songs[index].id}`, { method: 'DELETE' });
        await loadData();
        renderAll();
    }

    async function deletePost(index) {
        await apiRequest(`/posts/${data.posts[index].id}`, { method: 'DELETE' });
        await loadData();
        renderAll();
    }

    function handleDelete(event) {
        const target = event.target.closest(
            '[data-delete-show], [data-delete-song], [data-delete-post]'
        );

        if (!target) {
            return;
        }

        if (target.dataset.deleteShow !== undefined) {
            deleteShow(Number(target.dataset.deleteShow)).catch(console.error);
        }

        if (target.dataset.deleteSong !== undefined) {
            deleteSong(Number(target.dataset.deleteSong)).catch(console.error);
        }

        if (target.dataset.deletePost !== undefined) {
            deletePost(Number(target.dataset.deletePost)).catch(console.error);
        }
    }

    function handleEdit(event) {
        const target = event.target.closest('[data-edit-type]');
        if (!target) return;

        const index = Number(target.dataset.editIndex);
        const collection = target.dataset.editType === 'show'
            ? data.shows
            : target.dataset.editType === 'song'
                ? data.songs
                : data.posts;

        openEditModal(target.dataset.editType, collection[index]);
    }

    function handleActionMenu(event) {
        const button = event.target.closest('.row-actions');
        document.querySelectorAll('.action-menu.is-open').forEach(menu => {
            if (!button || menu !== button.parentElement) menu.classList.remove('is-open');
        });

        if (button) {
            button.parentElement.classList.toggle('is-open');
        }
    }


    // ============================================================
    // NAVIGATION
    // ============================================================

    const PAGE_TITLES = {
        overview: 'Good morning, Thando',
        schedule: 'Plan the day',
        music: 'Keep it in tune',
        news: 'Make the news'
    };

    function navigateTo(section) {
        updateSidebar(section);
        updatePanels(section);
        updatePageHeading(section);
    }

    function updateSidebar(section) {
        document
            .querySelectorAll('.side-link[data-section]')
            .forEach(link => {
                link.classList.toggle(
                    'active',
                    link.dataset.section === section
                );
            });
    }

    function updatePanels(section) {
        document
            .querySelectorAll('.content-section')
            .forEach(panel => {
                panel.classList.toggle(
                    'active',
                    panel.dataset.panel === section
                );
            });
    }

    function updatePageHeading(section) {
        if (!elements.pageHeading) return;

        const firstName = (data.user?.full_name || 'Station manager').split(' ')[0];
        const title = section === 'overview'
            ? `Good morning, ${firstName}`
            : PAGE_TITLES[section] || PAGE_TITLES.overview;

        elements.pageHeading.innerHTML =
            `${title} <span>✦</span>`;
    }

    function handleNavigation(button) {
        const section =
            button.dataset.section ||
            button.dataset.jump;

        if (section) {
            navigateTo(section);
        }
    }


    // ============================================================
    // NEWS FILTERS
    // ============================================================

    function handleNewsFilter(button) {
        document
            .querySelectorAll('.filter-button')
            .forEach(item => {
                item.classList.remove('active');
            });

        button.classList.add('active');

        renderPosts(button.dataset.filter);
    }

    function handleEditorToolbar(event) {
        const button = event.target.closest('[data-editor-command]');
        if (!button) return;

        const editor = document.getElementById('field-body');
        if (!editor) return;

        editor.focus();
        const command = button.dataset.editorCommand;
        const value = button.dataset.editorValue || null;

        if (command === 'createLink') {
            const url = window.prompt('Enter the link URL');
            if (!url) return;
            document.execCommand(command, false, url);
            return;
        }

        document.execCommand(command, false, value);
    }


    // ============================================================
    // EVENT LISTENERS
    // ============================================================

    function setupEventListeners() {

        // Authentication
        if (elements.loginForm) {
            elements.loginForm.addEventListener('submit', handleLogin);
        }

        if (elements.logoutButton) {
            elements.logoutButton.addEventListener('click', handleLogout);
        }


        // Add buttons
        if (elements.addShowButton) {
            elements.addShowButton.addEventListener('click', () => openModal('show'));
        }

        if (elements.addSongButton) {
            elements.addSongButton.addEventListener('click', () => openModal('song'));
        }

        if (elements.addPostButton) {
            elements.addPostButton.addEventListener('click', () => openModal('post'));
        }


        // Modal
        if (!elements.modal || !elements.modalClose || !elements.itemForm) return;

        elements.modalClose.addEventListener('click', closeModal);

        elements.modal.addEventListener(
            'click',
            event => {
                if (event.target === elements.modal) {
                    closeModal();
                }
            }
        );

        elements.itemForm.addEventListener(
            'submit',
            handleItemSubmit
        );


        // Delete buttons
        document.addEventListener(
            'click',
            handleDelete
        );

        document.addEventListener('click', handleEdit);
        document.addEventListener('click', handleActionMenu);
        document.addEventListener('click', handleEditorToolbar);


        // Navigation
        document
            .querySelectorAll('.side-link[data-section], [data-jump]')
            .forEach(button => {
                button.addEventListener(
                    'click',
                    () => handleNavigation(button)
                );
            });


        // News filters
        document
            .querySelectorAll('.filter-button')
            .forEach(button => {
                button.addEventListener(
                    'click',
                    () => handleNewsFilter(button)
                );
            });
    }


    // ============================================================
    // INITIALISE APPLICATION
    // ============================================================

    async function init() {
        setupEventListeners();

        if (isAuthenticated()) {
            try {
                await loadData();
            } catch (error) {
                console.error('Failed to load station data:', error);
                handleLogout();
                return;
            }

            if (elements.dashboard) {
                showDashboard();
            } else if (elements.loginView) {
                window.location.href = 'overview.html';
            }
        } else {
            if (elements.loginView) {
                showLogin();
            } else {
                window.location.href = 'login.html';
            }
        }
    }

    init();

})();