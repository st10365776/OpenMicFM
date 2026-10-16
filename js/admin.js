(function () {
    'use strict';

    // ============================================================
    // CONFIGURATION
    // ============================================================

    /*
     * The admin dashboard and API are hosted by the same Azure Web App.
     */
    const API_BASE = '/api';

    const AUTH_KEY = 'openmicfm-token';


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
    let activeWeekOffset = 0;
    let pickerDates = new Set();
    let pickerCursor = null;


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

        overviewScheduleTitle:
            document.querySelector('.schedule-preview h3'),

        profileName:
            document.querySelector('.profile strong'),

        profileInitials:
            document.querySelector('.profile > span'),

        profileRole:
            document.querySelector('.profile small'),

        showDetails:
            document.getElementById('show-details-backdrop'),

        showDetailsContent:
            document.getElementById('show-details-content'),

        showDetailsClose:
            document.getElementById('show-details-close'),

        overviewSchedule:
            document.getElementById('overview-schedule'),

        headerKickers:
            document.querySelectorAll('.header-kicker'),

        musicList:
            document.getElementById('music-list'),

        newsList:
            document.getElementById('news-list'),

        allCount:
            document.getElementById('all-count'),

        pageHeading:
            document.getElementById('page-heading'),

        addShowButton:
            document.getElementById('add-show-button'),

        addSongButton:
            document.getElementById('add-song-button'),

        addPostButton:
            document.getElementById('add-post-button')
    };


    // ============================================================
    // STORAGE / API
    // ============================================================

    function getAuthToken() {
        return sessionStorage.getItem(AUTH_KEY);
    }


    async function apiRequest(path, options = {}) {

        const headers = {
            ...(options.headers || {})
        };

        /*
         * Don't manually set Content-Type for FormData.
         * The browser needs to set the multipart boundary itself.
         */
        if (
            !(options.body instanceof FormData) &&
            !headers['Content-Type']
        ) {
            headers['Content-Type'] = 'application/json';
        }

        const token = getAuthToken();

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const requestOptions = {
            ...options,
            headers
        };

        /*
         * Convert JavaScript objects to JSON.
         * Leave FormData and already-stringified bodies alone.
         */
        if (
            options.body &&
            !(options.body instanceof FormData) &&
            typeof options.body !== 'string'
        ) {
            requestOptions.body = JSON.stringify(options.body);
        }

        const response = await fetch(
            `${API_BASE}${path}`,
            requestOptions
        );

        if (!response.ok) {

            let message =
                `Request failed (${response.status})`;

            try {
                const error = await response.json();

                message =
                    error.message ||
                    error.error ||
                    message;

            } catch (error) {
                // Response was not JSON.
            }

            throw new Error(message);
        }

        /*
         * DELETE requests can return 204 No Content.
         */
        if (response.status === 204) {
            return null;
        }

        /*
         * Some successful endpoints may return an empty response.
         */
        const contentType =
            response.headers.get('content-type') || '';

        if (!contentType.includes('application/json')) {
            return null;
        }

        return response.json();
    }


    // ============================================================
    // DATA NORMALISATION
    // ============================================================

    function normalizeShow(show = {}) {

        const startTime =
            String(show.start_time || '').slice(0, 5);

        const endTime =
            String(show.end_time || '').slice(0, 5);

        const time =
            show.time ||
            (
                startTime && endTime
                    ? `${startTime} – ${endTime}`
                    : ''
            );

        const showDates =
            Array.isArray(show.show_dates)
                ? [...new Set(
                    show.show_dates
                        .map(value => String(value).slice(0, 10))
                        .filter(Boolean)
                )].sort()
                : [];

        return {
            ...show,
            name: show.name || show.title || '',
            title: show.title || show.name || '',
            presenter: show.presenter || '',
            initials:
                show.initials ||
                getInitials(show.presenter || show.name || ''),
            time,
            days_of_week:
                Array.isArray(show.days_of_week)
                    ? show.days_of_week
                    : show.day_of_week
                        ? [show.day_of_week]
                        : [],
            show_dates: showDates,
            start_date: show.start_date
                ? String(show.start_date).slice(0, 10)
                : '',
            end_date: show.end_date
                ? String(show.end_date).slice(0, 10)
                : ''
        };
    }


    function normalizeSong(song = {}) {
        return {
            ...song,
            title: song.title || '',
            artist: song.artist || '',
            plays: Number(song.plays) || 0,
            rank: Number(song.rank) || 0,
            visible: song.visible !== false,
            image: song.image || ''
        };
    }


    function normalizePost(post = {}) {
        return {
            ...post,
            type: post.type || 'Local',
            title: post.title || '',
            excerpt: post.excerpt || '',
            body: post.body || '',
            status: post.status || 'Draft',
            image: post.image || ''
        };
    }


    async function loadData() {

        const [
            showsResponse,
            songsResponse,
            postsResponse,
            dashboardResponse
        ] = await Promise.all([
            apiRequest('/shows'),
            apiRequest('/songs'),
            apiRequest('/posts'),
            apiRequest('/dashboard')
        ]);

        const shows =
            Array.isArray(showsResponse)
                ? showsResponse
                : [];

        const songs =
            Array.isArray(songsResponse)
                ? songsResponse
                : [];

        const posts =
            Array.isArray(postsResponse)
                ? postsResponse
                : [];

        const dashboard =
            dashboardResponse &&
            typeof dashboardResponse === 'object'
                ? dashboardResponse
                : {};

        data = {
            shows: shows.map(normalizeShow),
            songs: songs.map(normalizeSong),
            posts: posts.map(normalizePost),
            metrics: Array.isArray(dashboard.metrics)
                ? dashboard.metrics
                : [],
            activity: Array.isArray(dashboard.activity)
                ? dashboard.activity
                : [],
            user: dashboard.user || null
        };
    }


    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================

    function escapeHtml(value) {

        return String(value ?? '')
            .replace(/[&<>'"]/g, character => {

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


    /*
     * IMPORTANT:
     *
     * Uploaded Azure files already come back as:
     *
     * /uploads/example.jpg
     *
     * Do NOT prepend localhost.
     */
    function mediaUrl(value) {

        if (!value) {
            return '';
        }

        if (
            value.startsWith('/uploads/') ||
            value.startsWith('/images/')
        ) {
            return value;
        }

        if (
            value.startsWith('http://') ||
            value.startsWith('https://')
        ) {
            return value;
        }

        if (value.startsWith('../') || value.startsWith('./')) {
            return value;
        }

        return `../images/${value}`;
    }


    function getInitials(name = '') {

        return String(name)
            .split(' ')
            .filter(Boolean)
            .map(part => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
    }


    function getTimeParts(time = '') {

        const parts =
            String(time)
                .split(/\s*[–-]\s*/);

        return {
            start: (parts[0] || '').trim(),
            end: (parts[1] || '').trim()
        };
    }


    function formatTime(value = '') {

        return String(value)
            .replace(/\s+/g, ' ')
            .trim();
    }


    function formatDateInput(date) {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0')
        ].join('-');
    }


    // ============================================================
    // AUTHENTICATION
    // ============================================================

    function isAuthenticated() {
        return Boolean(getAuthToken());
    }


    function showDashboard() {

        if (elements.loginView) {
            elements.loginView.hidden = true;
        }

        if (elements.dashboard) {
            elements.dashboard.hidden = false;
        }

        renderAll();
    }


    function showLogin() {

        if (elements.dashboard) {
            elements.dashboard.hidden = true;
        }

        if (elements.loginView) {
            elements.loginView.hidden = false;
        }
    }


    async function handleLogin(event) {

        event.preventDefault();

        const email =
            elements.loginEmail
                ? elements.loginEmail.value.trim()
                : '';

        const password =
            elements.loginPassword
                ? elements.loginPassword.value
                : '';

        if (!email || !password) {

            if (elements.loginMessage) {
                elements.loginMessage.textContent =
                    'Please enter your email and password.';
            }

            return;
        }

        try {

            const result =
                await apiRequest('/auth/login', {
                    method: 'POST',
                    body: {
                        email,
                        password
                    }
                });

            if (!result || !result.token) {
                throw new Error(
                    'The login response did not include a token.'
                );
            }

            sessionStorage.setItem(
                AUTH_KEY,
                result.token
            );

            await loadData();

            if (elements.loginMessage) {
                elements.loginMessage.textContent = '';
            }

        } catch (error) {

            console.error('Login failed:', error);

            if (elements.loginMessage) {
                elements.loginMessage.textContent =
                    error.message ||
                    'Unable to sign in. Please try again.';
            }

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

        if (elements.statShows) {
            elements.statShows.textContent =
                data.shows.length;
        }

        if (elements.statTracks) {
            elements.statTracks.textContent =
                data.songs.length;
        }

        if (elements.statPosts) {
            elements.statPosts.textContent =
                data.posts.filter(
                    post => post.status === 'Published'
                ).length;
        }

        const reach =
            data.metrics.find(
                metric =>
                    metric.metric_key === 'weekly_reach'
            );

        if (reach && elements.weeklyReach) {

            const value =
                Number(reach.metric_value) || 0;

            elements.weeklyReach.textContent =
                `${(value / 1000).toFixed(1)}k`;
        }

        if (reach && elements.weeklyChange) {

            const change =
                escapeHtml(
                    reach.change_value ?? ''
                );

            const changeText =
                escapeHtml(
                    reach.change_text ?? ''
                );

            elements.weeklyChange.innerHTML =
                `↑ ${change}% <span>${changeText}</span>`;
        }
    }


    function renderDashboardDetails() {

        if (data.user) {

            const fullName =
                data.user.full_name ||
                'Station manager';

            if (elements.profileName) {
                elements.profileName.textContent =
                    fullName;
            }

            if (elements.profileInitials) {
                elements.profileInitials.textContent =
                    data.user.initials ||
                    getInitials(fullName);
            }

            if (
                elements.profileRole &&
                data.user.role
            ) {
                elements.profileRole.textContent =
                    data.user.role;
            }
        }

        const activePanel =
            document.querySelector(
                '.content-section.active'
            );

        updatePageHeading(
            activePanel?.dataset.panel ||
            'overview'
        );


        // Activity
        if (elements.activityList) {

            elements.activityList.innerHTML =
                data.activity.length

                    ? data.activity.map(activity => {

                        const icon =
                            activity.icon === 'yellow'
                                ? '♫'
                                : activity.icon === 'green'
                                    ? '✓'
                                    : '◷';

                        return `
                            <div>

                                <span class="activity-mark ${escapeHtml(
                                    activity.icon || ''
                                )}">
                                    ${icon}
                                </span>

                                <p>

                                    <strong>
                                        ${escapeHtml(
                                            activity.title || ''
                                        )}
                                    </strong>

                                    <small>
                                        by
                                        ${escapeHtml(
                                            activity.actor_name || ''
                                        )}
                                        ·
                                        ${formatRelativeTime(
                                            activity.created_at
                                        )}
                                    </small>

                                </p>

                                <span class="activity-tag">
                                    ${escapeHtml(
                                        activity.category || ''
                                    )}
                                </span>

                            </div>
                        `;

                    }).join('')

                    : '<p class="muted">No recent activity.</p>';
        }
    }


    function formatRelativeTime(value) {

        if (!value) {
            return 'recently';
        }

        const timestamp =
            new Date(value).getTime();

        if (Number.isNaN(timestamp)) {
            return 'recently';
        }

        const elapsedMinutes =
            Math.max(
                0,
                Math.floor(
                    (Date.now() - timestamp) / 60000
                )
            );

        if (elapsedMinutes < 1) {
            return 'just now';
        }

        if (elapsedMinutes < 60) {
            return `${elapsedMinutes} minute${
                elapsedMinutes === 1 ? '' : 's'
            } ago`;
        }

        const elapsedHours =
            Math.floor(elapsedMinutes / 60);

        if (elapsedHours < 24) {
            return `${elapsedHours} hour${
                elapsedHours === 1 ? '' : 's'
            } ago`;
        }

        const elapsedDays =
            Math.floor(elapsedHours / 24);

        return `${elapsedDays} day${
            elapsedDays === 1 ? '' : 's'
        } ago`;
    }


    // ============================================================
    // SCHEDULE
    // ============================================================

    function renderSchedule() {

        renderDateContext();
        renderFullSchedule();
        renderOverviewSchedule();
    }


    function renderDateContext() {

        const today = new Date();

        const dateFormatter =
            new Intl.DateTimeFormat('en-ZA', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });

        if (elements.headerKickers) {

            elements.headerKickers.forEach(kicker => {

                kicker.textContent =
                    dateFormatter
                        .format(today)
                        .toUpperCase();
            });
        }


    }


    function renderFullSchedule() {

        const calendar =
            document.querySelector('.schedule-table');

        const toolbar =
            document.querySelector('.toolbar');

        if (!calendar || !toolbar) {
            return;
        }

        const shows = data.shows.map(normalizeShow);

        const today = new Date();
        const todayKey = formatDateInput(today);
        const weekStart = new Date(today);
        weekStart.setDate(
            today.getDate() - ((today.getDay() + 6) % 7) + activeWeekOffset * 7
        );
        weekStart.setHours(0, 0, 0, 0);

        const days = Array.from({ length: 7 }, (_, index) => {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + index);

            return {
                date,
                dateKey: formatDateInput(date),
                label: new Intl.DateTimeFormat('en-US', {
                    weekday: 'short'
                }).format(date),
                dayKey: new Intl.DateTimeFormat('en-US', {
                    weekday: 'short'
                }).format(date).slice(0, 3).toLowerCase()
            };
        });

        const weekEnd = days[6].date;
        const rangeFormatter = new Intl.DateTimeFormat('en-ZA', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        const toneNames = ['blue', 'green', 'red', 'yellow'];

        const showsForDay = day => shows
            .map((show, index) => ({ show, index }))
            .filter(({ show }) => {

                // Shows assigned to specific on-air dates.
                if (show.show_dates.length) {
                    return show.show_dates.includes(day.dateKey);
                }

                // Legacy weekday-based shows.
                const showDays = show.days_of_week.length
                    ? show.days_of_week
                    : show.day_of_week
                        ? [show.day_of_week]
                        : [];

                if (!showDays.length) {
                    return false;
                }

                const withinDateRange =
                    (!show.start_date || show.start_date <= day.dateKey) &&
                    (!show.end_date || show.end_date >= day.dateKey);

                return withinDateRange && showDays.some(showDay =>
                    String(showDay).slice(0, 3).toLowerCase() === day.dayKey
                );
            })
            .sort((first, second) =>
                String(first.show.start_time || '').localeCompare(
                    String(second.show.start_time || '')
                )
            );

        const weekShowCount = days.reduce(
            (total, day) => total + showsForDay(day).length,
            0
        );

        toolbar.innerHTML = `
            <div class="calendar-controls" aria-label="Calendar navigation">
                <button class="calendar-nav" type="button" data-calendar-week="-1" aria-label="Previous week">‹</button>
                <strong>${rangeFormatter.format(weekStart)} – ${rangeFormatter.format(weekEnd)}</strong>
                <button class="calendar-nav" type="button" data-calendar-week="1" aria-label="Next week">›</button>
                <button class="calendar-today" type="button" data-calendar-today>Today</button>
            </div>
            <span class="toolbar-note">${weekShowCount} ${weekShowCount === 1 ? 'show' : 'shows'} this week</span>
        `;

        const dayColumns = days.map(day => {
            const dayShows = showsForDay(day);

            const events = dayShows.length
                ? dayShows.map(({ show, index }) => {
                    const tone = toneNames.includes(show.tone)
                        ? show.tone
                        : 'blue';

                    return `
                        <button class="calendar-event tone-${tone}"
                            type="button" data-calendar-show="${index}">
                            <time>${escapeHtml(show.time || '')}</time>
                            <strong>${escapeHtml(show.name || '')}</strong>
                            <span>${escapeHtml(show.presenter || '')}</span>
                        </button>
                    `;
                }).join('')
                : '<p class="calendar-empty">No shows</p>';

            const isToday = day.dateKey === todayKey;

            return `
                <section class="calendar-day${isToday ? ' is-today' : ''}" aria-label="${day.label} ${day.date.getDate()}">
                    <header><span>${day.label}${isToday ? ' · Today' : ''}</span><strong>${day.date.getDate()}</strong></header>
                    <div class="calendar-day-events">${events}</div>
                </section>
            `;
        }).join('');

        calendar.innerHTML = `
            <div class="calendar-grid" aria-label="Weekly show calendar">
                <div class="calendar-days">${dayColumns}</div>
            </div>
        `;
    }


    // ============================================================
    // SHOW DETAILS POPUP
    // ============================================================

    function openShowDetails(index) {

        if (
            !elements.showDetails ||
            !elements.showDetailsContent
        ) {
            return;
        }

        const show = data.shows[index];

        if (!show) {
            return;
        }

        const chipFormatter = new Intl.DateTimeFormat('en-ZA', {
            day: 'numeric',
            month: 'short',
            timeZone: 'UTC'
        });

        const chips = show.show_dates.length
            ? show.show_dates.map(value =>
                chipFormatter.format(new Date(`${value}T00:00:00Z`))
            )
            : (
                show.days_of_week.length
                    ? show.days_of_week
                    : show.day_of_week
                        ? [show.day_of_week]
                        : []
            );

        elements.showDetailsContent.innerHTML = `
            <p class="eyebrow">SHOW DETAILS</p>

            <h2 id="show-details-title">
                ${escapeHtml(show.name || '')}
            </h2>

            <p class="details-presenter">
                Presented by
                <strong>${escapeHtml(show.presenter || 'Unassigned')}</strong>
            </p>

            <dl class="details-meta">
                <div>
                    <dt>Time slot</dt>
                    <dd>${escapeHtml(show.time || 'Not set')}</dd>
                </div>

                <div>
                    <dt>${show.show_dates.length ? 'Dates' : 'Days'}</dt>
                    <dd>
                        ${
                            chips.length
                                ? `${chips.length} ${chips.length === 1 ? 'date' : 'dates'}`
                                : 'Not set'
                        }
                    </dd>
                </div>
            </dl>

            ${
                chips.length
                    ? `
                        <div class="details-days" aria-label="On-air dates">
                            ${chips
                                .map(chip => `<span>${escapeHtml(chip)}</span>`)
                                .join('')}
                        </div>
                    `
                    : ''
            }

            ${
                show.description
                    ? `<p class="details-description">${escapeHtml(show.description)}</p>`
                    : ''
            }

            ${
                show.id
                    ? `
                        <div class="details-actions">
                            <button
                                class="button button-primary"
                                type="button"
                                data-edit-type="show"
                                data-edit-index="${index}"
                            >
                                Edit show
                            </button>

                            <button
                                class="details-delete"
                                type="button"
                                data-delete-show="${index}"
                            >
                                Delete
                            </button>
                        </div>
                    `
                    : ''
            }
        `;

        elements.showDetails.hidden = false;
    }


    function closeShowDetails() {

        if (elements.showDetails) {
            elements.showDetails.hidden = true;
        }
    }


    function renderOverviewSchedule() {

        if (!elements.overviewSchedule) {
            return;
        }

        if (elements.overviewScheduleTitle) {

            elements.overviewScheduleTitle.textContent =
                `${new Intl.DateTimeFormat(
                    'en-US',
                    { weekday: 'long' }
                ).format(new Date())} line-up`;
        }

        const todayDayKey =
            new Intl.DateTimeFormat(
                'en-US',
                { weekday: 'short' }
            )
                .format(new Date())
                .slice(0, 3)
                .toLowerCase();

        const todaysShows =
            data.shows
                .map(normalizeShow)
                .filter(show => {

                    if (show.show_dates.length) {
                        return show.show_dates.includes(todayKey);
                    }

                    const days =
                        show.days_of_week.length
                            ? show.days_of_week
                            : show.day_of_week
                                ? [show.day_of_week]
                                : [];

                    const withinRange =
                        (!show.start_date || show.start_date <= todayKey) &&
                        (!show.end_date || show.end_date >= todayKey);

                    return (
                        withinRange &&
                        (!days.length ||
                            days.some(day =>
                                String(day)
                                    .slice(0, 3)
                                    .toLowerCase() ===
                                todayDayKey
                            )
                        )
                    );
                })
                .sort((first, second) =>
                    String(first.start_time || '')
                        .localeCompare(
                            String(second.start_time || '')
                        )
                );

        const html =
            todaysShows
                .slice(0, 4)
                .map(show => {

                    const safeShow =
                        normalizeShow(show);

                    return `
                        <div class="schedule-row">

                            <time>
                                ${escapeHtml(
                                    (
                                        safeShow.time || ''
                                    ).split(' ')[0]
                                )}
                            </time>

                            <div>

                                <strong>
                                    ${escapeHtml(
                                        safeShow.name || ''
                                    )}
                                </strong>

                                <small>
                                    ${escapeHtml(
                                        safeShow.presenter || ''
                                    )}
                                </small>

                            </div>

                            <span class="status-pill">
                                On air
                            </span>

                        </div>
                    `;
                })
                .join('');

        elements.overviewSchedule.innerHTML =
            html ||
            '<p class="muted">No shows scheduled today.</p>';
    }


    // ============================================================
    // MUSIC
    // ============================================================

    function renderMusic() {

        if (!elements.musicList) {
            return;
        }

        const html =
            data.songs
                .map((song, index) => {

                    const image =
                        mediaUrl(song.image);

                    return `
                        <div class="music-item">

                            <span class="rank">
                                ${String(
                                    song.rank || index + 1
                                ).padStart(2, '0')}
                            </span>

                            <div class="track">

                                ${
                                    image
                                        ? `
                                            <img
                                                class="song-artwork"
                                                src="${escapeHtml(image)}"
                                                alt=""
                                                onerror="this.onerror=null;this.src='../images/no-image.png';"
                                            >
                                        `
                                        : ''
                                }

                                <div>

                                    <strong>
                                        ${escapeHtml(
                                            song.title
                                        )}
                                    </strong>

                                    <small>
                                        ${song.visible ? 'Shown on website' : 'Hidden from website'}
                                    </small>

                                </div>

                            </div>

                            <span>
                                ${escapeHtml(
                                    song.artist
                                )}
                            </span>

                            <span class="plays">
                                ${escapeHtml(
                                    song.plays
                                )} plays
                            </span>

                            ${
                                song.id
                                    ? `
                                        <div class="action-menu">

                                            <button
                                                class="row-actions"
                                                type="button"
                                                aria-label="Song actions"
                                            >
                                                ···
                                            </button>

                                            <div class="action-menu-options">

                                                <button
                                                    type="button"
                                                    data-edit-type="song"
                                                    data-edit-index="${index}"
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    data-delete-song="${index}"
                                                >
                                                    Delete
                                                </button>

                                            </div>

                                        </div>
                                    `
                                    : ''
                            }

                        </div>
                    `;
                })
                .join('');

        elements.musicList.innerHTML =
            html;
    }


    // ============================================================
    // NEWS / POSTS
    // ============================================================

    function renderPosts(filter = 'all') {

        if (!elements.newsList) {
            return;
        }

        const filteredPosts =
            data.posts.filter(post => {

                if (!filter || filter === 'all') {
                    return true;
                }

                if (filter === 'draft') {
                    return post.status === 'Draft';
                }

                return String(post.type || '')
                    .toLowerCase() ===
                    String(filter).toLowerCase();
            });


        const html =
            filteredPosts
                .map(post => {

                    const originalIndex =
                        data.posts.indexOf(post);

                    return `
                        <article class="news-card">

                            <div class="news-card-top">

                                <span class="news-type">
                                    ${escapeHtml(
                                        post.type
                                    )}
                                </span>

                                <span
                                    class="${
                                        post.status === 'Draft'
                                            ? 'draft-badge'
                                            : ''
                                    }"
                                >
                                    ${escapeHtml(
                                        post.status
                                    )}
                                </span>

                            </div>

                            <h3>
                                ${escapeHtml(
                                    post.title
                                )}
                            </h3>

                            <p>
                                ${escapeHtml(
                                    post.excerpt
                                )}
                            </p>

                            <footer>

                                <span>
                                    ${escapeHtml(
                                        post.date ||
                                        post.published_at ||
                                        post.created_at ||
                                        ''
                                    )}
                                </span>

                                ${
                                    post.id
                                        ? `
                                            <div class="action-menu">

                                                <button
                                                    class="row-actions"
                                                    type="button"
                                                    aria-label="News actions"
                                                >
                                                    ···
                                                </button>

                                                <div class="action-menu-options">

                                                    <button
                                                        type="button"
                                                        data-edit-type="post"
                                                        data-edit-index="${originalIndex}"
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        data-delete-post="${originalIndex}"
                                                    >
                                                        Delete
                                                    </button>

                                                </div>

                                            </div>
                                        `
                                        : ''
                                }

                            </footer>

                        </article>
                    `;
                })
                .join('');


        elements.newsList.innerHTML =
            html;

        if (elements.allCount) {
            elements.allCount.textContent =
                data.posts.length;
        }
    }


    // ============================================================
    // MODAL FIELDS
    // ============================================================

    function getShowFields() {

        return `
            <div class="form-field">
                <label for="field-name">Show name</label>
                <input
                    id="field-name"
                    required
                    placeholder="The Mid-Morning Mix"
                >
            </div>

            <div class="form-field">
                <label for="field-presenter">Presenter</label>
                <input
                    id="field-presenter"
                    required
                    placeholder="Presenter name"
                >
            </div>

            <div class="form-field">
                <label for="field-title">Show title</label>
                <input
                    id="field-title"
                    required
                    placeholder="On-air title"
                >
            </div>

            <div class="form-field">
                <label for="field-time">Time slot</label>
                <input
                    id="field-time"
                    required
                    placeholder="09:00 – 12:00"
                >
            </div>

            <div class="form-field full">

                <label>
                    On-air dates
                </label>

                <div class="date-picker" id="field-dates">

                    <div class="date-picker-head">
                        <button
                            type="button"
                            class="date-nav"
                            data-date-nav="-1"
                            aria-label="Previous month"
                        >‹</button>

                        <strong id="date-picker-label"></strong>

                        <button
                            type="button"
                            class="date-nav"
                            data-date-nav="1"
                            aria-label="Next month"
                        >›</button>
                    </div>

                    <div class="date-picker-weekdays" aria-hidden="true">
                        <span>M</span><span>T</span><span>W</span>
                        <span>T</span><span>F</span><span>S</span>
                        <span>S</span>
                    </div>

                    <div
                        class="date-picker-grid"
                        id="date-picker-grid"
                    ></div>

                    <div
                        class="selected-dates"
                        id="selected-dates"
                    ></div>

                </div>

                <small class="field-hint">
                    Click dates to pick every day this show airs.
                </small>

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
                >

            </div>
        `;
    }


    function getSongFields() {

        return `
            <div class="form-field">
                <label for="field-song-rank">Top 10 position</label>
                <input
                    id="field-song-rank"
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value="${editingItem?.rank || Math.min(data.songs.length + 1, 10)}"
                    required
                >
                <small>Choose a position from 1 to 10.</small>
            </div>

            <div class="form-field">
                <label for="field-title">Song title</label>
                <input id="field-title" required placeholder="Song title">
            </div>

            <div class="form-field">
                <label for="field-artist">Artist</label>
                <input id="field-artist" required placeholder="Artist name">
            </div>

            <div class="form-field">
                <label for="field-song-image">Song artwork</label>
                <input
                    id="field-song-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                >
            </div>

            <div class="form-field">
                <label for="field-plays">Current plays</label>
                <input
                    id="field-plays"
                    type="number"
                    min="0"
                    value="0"
                    required
                >
            </div>

            <div class="form-field form-field-checkbox">
                <label class="checkbox-label" for="field-song-visible">
                    <input
                        id="field-song-visible"
                        type="checkbox"
                        checked
                    >
                    <span>Show this song on the website</span>
                </label>
                <small>Turn this off to keep the song in the dashboard but hide it from the public Top 10.</small>
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

                    <option>
                        Local
                    </option>

                    <option>
                        National
                    </option>

                    <option>
                        Sport
                    </option>

                </select>

            </div>


            <div class="form-field">

                <label for="field-status">
                    Status
                </label>

                <select id="field-status">

                    <option>
                        Published
                    </option>

                    <option>
                        Draft
                    </option>

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

                <label>
                    Story content
                </label>

                <div
                    class="editor-toolbar"
                    role="toolbar"
                    aria-label="Story formatting"
                >

                    <button
                        type="button"
                        data-editor-command="bold"
                    >
                        <strong>B</strong>
                    </button>

                    <button
                        type="button"
                        data-editor-command="italic"
                    >
                        <em>I</em>
                    </button>

                    <button
                        type="button"
                        data-editor-command="underline"
                    >
                        <u>U</u>
                    </button>

                    <button
                        type="button"
                        data-editor-command="formatBlock"
                        data-editor-value="<h2>"
                    >
                        H2
                    </button>

                    <button
                        type="button"
                        data-editor-command="insertUnorderedList"
                    >
                        List
                    </button>

                    <button
                        type="button"
                        data-editor-command="insertOrderedList"
                    >
                        1. List
                    </button>

                    <button
                        type="button"
                        data-editor-command="createLink"
                    >
                        Link
                    </button>

                </div>


                <div
                    id="field-body"
                    class="rich-editor"
                    contenteditable="true"
                    role="textbox"
                    aria-multiline="true"
                ></div>

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


    // ============================================================
    // OPEN / EDIT MODALS
    // ============================================================

    function openModal(type) {

        if (
            !elements.modal ||
            !elements.modalFields ||
            !elements.modalTitle
        ) {
            return;
        }

        activeModal = type;
        editingItem = null;

        elements.modalTitle.textContent =
            getModalTitle(type);

        elements.modalFields.innerHTML =
            getModalFields(type);

        if (type === 'show') {
            setupShowDatePicker([]);
        }

        elements.modal.hidden = false;

        const firstField =
            elements.modalFields.querySelector(
                'input, select, textarea'
            );

        if (firstField) {
            firstField.focus();
        }
    }


    function openEditModal(type, item) {

        if (!item) {
            return;
        }

        if (
            !elements.modal ||
            !elements.modalFields ||
            !elements.modalTitle
        ) {
            return;
        }

        activeModal = type;
        editingItem = item;

        closeShowDetails();

        elements.modalTitle.textContent =
            `Edit ${
                type === 'post'
                    ? 'story'
                    : type
            }`;

        elements.modalFields.innerHTML =
            getModalFields(type);

        elements.modal.hidden = false;


        // --------------------------------------------------------
        // SHOW
        // --------------------------------------------------------

        if (type === 'show') {

            setupShowDatePicker(item.show_dates || []);

            const timeField =
                document.getElementById(
                    'field-time'
                );

            if (timeField) {

                timeField.value =
                    item.time ||
                    (
                        item.start_time &&
                        item.end_time
                            ? `${String(
                                item.start_time
                            ).slice(0, 5)} – ${String(
                                item.end_time
                            ).slice(0, 5)}`
                            : ''
                    );
            }


            const nameField =
                document.getElementById(
                    'field-name'
                );

            if (nameField) {
                nameField.value =
                    item.name || '';
            }


            const titleField =
                document.getElementById(
                    'field-title'
                );

            if (titleField) {
                titleField.value =
                    item.title ||
                    item.name ||
                    '';
            }


            const descriptionField =
                document.getElementById(
                    'field-description'
                );

            if (descriptionField) {
                descriptionField.value =
                    item.description || '';
            }


            const presenterField =
                document.getElementById(
                    'field-presenter'
                );

            if (presenterField) {
                presenterField.value =
                    item.presenter || '';
            }
        }


        // --------------------------------------------------------
        // SONG
        // --------------------------------------------------------

        if (type === 'song') {

            const rankField =
                document.getElementById(
                    'field-song-rank'
                );

            if (rankField) {
                rankField.value =
                    item.rank || 1;
            }

            const visibleField =
                document.getElementById(
                    'field-song-visible'
                );

            if (visibleField) {
                visibleField.checked =
                    item.visible !== false;
            }

            const titleField =
                document.getElementById(
                    'field-title'
                );

            if (titleField) {
                titleField.value =
                    item.title || '';
            }


            const artistField =
                document.getElementById(
                    'field-artist'
                );

            if (artistField) {
                artistField.value =
                    item.artist || '';
            }


            const playsField =
                document.getElementById(
                    'field-plays'
                );

            if (playsField) {
                playsField.value =
                    item.plays || 0;
            }
        }


        // --------------------------------------------------------
        // POST
        // --------------------------------------------------------

        if (type === 'post') {

            const typeField =
                document.getElementById(
                    'field-type'
                );

            if (typeField) {
                typeField.value =
                    item.type || 'Local';
            }


            const statusField =
                document.getElementById(
                    'field-status'
                );

            if (statusField) {
                statusField.value =
                    item.status || 'Draft';
            }


            const titleField =
                document.getElementById(
                    'field-title'
                );

            if (titleField) {
                titleField.value =
                    item.title || '';
            }


            const excerptField =
                document.getElementById(
                    'field-excerpt'
                );

            if (excerptField) {
                excerptField.value =
                    item.excerpt || '';
            }


            const bodyField =
                document.getElementById(
                    'field-body'
                );

            if (bodyField) {
                bodyField.innerHTML =
                    item.body || '';
            }
        }


        const firstField =
            elements.modalFields.querySelector(
                'input, select, textarea'
            );

        if (firstField) {
            firstField.focus();
        }
    }


    function closeModal() {

        if (elements.modal) {
            elements.modal.hidden = true;
        }

        activeModal = '';
        editingItem = null;
    }


    // ============================================================
    // FORM HELPERS
    // ============================================================

    function getFieldValue(id) {

        const field =
            document.getElementById(id);

        return field
            ? field.value.trim()
            : '';
    }


    function getEditorValue() {

        const editor =
            document.getElementById(
                'field-body'
            );

        return editor
            ? editor.innerHTML.trim()
            : '';
    }


    // ============================================================
    // FORM SUBMISSION
    // ============================================================

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

                default:
                    return;
            }

            await loadData();

            renderAll();

            closeModal();

        } catch (error) {

            console.error(
                'Failed to save dashboard item:',
                error
            );

            window.alert(
                error.message ||
                'Unable to save this item.'
            );
        }
    }


    // ============================================================
    // MULTI-DATE PICKER
    // ============================================================

    function renderDatePicker() {

        const grid =
            document.getElementById('date-picker-grid');

        const label =
            document.getElementById('date-picker-label');

        const chips =
            document.getElementById('selected-dates');

        if (!grid || !label || !chips) {
            return;
        }

        if (!pickerCursor) {
            pickerCursor = new Date();
        }

        const year = pickerCursor.getFullYear();
        const month = pickerCursor.getMonth();

        label.textContent =
            new Intl.DateTimeFormat('en-ZA', {
                month: 'long',
                year: 'numeric'
            }).format(pickerCursor);

        const leadingBlanks =
            (new Date(year, month, 1).getDay() + 6) % 7;

        const daysInMonth =
            new Date(year, month + 1, 0).getDate();

        const todayKey = formatDateInput(new Date());

        let html = '';

        for (let i = 0; i < leadingBlanks; i++) {
            html += '<span class="date-cell empty"></span>';
        }

        for (let day = 1; day <= daysInMonth; day++) {

            const key =
                `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const classes = ['date-cell'];

            if (pickerDates.has(key)) {
                classes.push('selected');
            }

            if (key === todayKey) {
                classes.push('today');
            }

            html += `<button type="button" class="${classes.join(' ')}" data-date="${key}">${day}</button>`;
        }

        grid.innerHTML = html;

        const sorted = [...pickerDates].sort();

        chips.innerHTML = sorted.length
            ? sorted
                .map(key => {

                    const text =
                        new Intl.DateTimeFormat('en-ZA', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            timeZone: 'UTC'
                        }).format(new Date(`${key}T00:00:00Z`));

                    return `<button type="button" class="selected-date" data-date-remove="${key}">${text}<span aria-hidden="true">×</span></button>`;
                })
                .join('')
            : '<span class="selected-dates-empty">No dates picked yet</span>';
    }


    function handleDatePickerClick(event) {

        const nav =
            event.target.closest('[data-date-nav]');

        if (nav) {

            pickerCursor = new Date(
                pickerCursor.getFullYear(),
                pickerCursor.getMonth() +
                    Number(nav.dataset.dateNav),
                1
            );

            renderDatePicker();
            return;
        }

        const cell =
            event.target.closest('[data-date]');

        if (cell) {

            const key = cell.dataset.date;

            if (pickerDates.has(key)) {
                pickerDates.delete(key);
            } else {
                pickerDates.add(key);
            }

            renderDatePicker();
            return;
        }

        const remove =
            event.target.closest('[data-date-remove]');

        if (remove) {
            pickerDates.delete(remove.dataset.dateRemove);
            renderDatePicker();
        }
    }


    function setupShowDatePicker(dates) {

        pickerDates = new Set(dates);

        const first = [...pickerDates].sort()[0];

        pickerCursor = first
            ? new Date(`${first}T00:00:00`)
            : new Date();

        const picker =
            document.getElementById('field-dates');

        if (picker) {
            picker.addEventListener(
                'click',
                handleDatePickerClick
            );
        }

        renderDatePicker();
    }


    // ============================================================
    // SHOW SAVE
    // ============================================================

    function timeToMinutes(value) {
        const match = String(value || '').match(/^(\d{2}):(\d{2})/);

        if (!match) {
            return null;
        }

        return Number(match[1]) * 60 + Number(match[2]);
    }


    function findShowScheduleConflict({
        dates,
        startTime,
        endTime,
        excludeId
    }) {
        const newStart = timeToMinutes(startTime);
        const newEnd = timeToMinutes(endTime);

        if (
            newStart === null ||
            newEnd === null ||
            newEnd <= newStart
        ) {
            throw new Error('Enter a valid time range. The end time must be after the start time.');
        }

        let earliestConflict = null;

        for (const date of dates) {

            const weekday =
                new Intl.DateTimeFormat('en-US', {
                    weekday: 'short',
                    timeZone: 'UTC'
                }).format(new Date(`${date}T00:00:00Z`));

            for (const show of data.shows) {
                if (excludeId && String(show.id) === String(excludeId)) {
                    continue;
                }

                const existingStartTime = timeToMinutes(show.start_time);
                const existingEndTime = timeToMinutes(show.end_time);

                if (
                    existingStartTime === null ||
                    existingEndTime === null ||
                    newStart >= existingEndTime ||
                    newEnd <= existingStartTime
                ) {
                    continue;
                }

                const occurs = show.show_dates?.length
                    ? show.show_dates.includes(date)
                    : (
                        show.days_of_week?.length
                            ? show.days_of_week
                            : show.day_of_week
                                ? [show.day_of_week]
                                : []
                    ).some(day =>
                        String(day).slice(0, 3) === weekday
                    ) &&
                        (!show.start_date || show.start_date <= date) &&
                        (!show.end_date || show.end_date >= date);

                if (
                    occurs &&
                    (
                        !earliestConflict ||
                        date < earliestConflict.date
                    )
                ) {
                    earliestConflict = {
                        date,
                        show,
                        startTime:
                            String(show.start_time).slice(0, 5),
                        endTime:
                            String(show.end_time).slice(0, 5)
                    };
                }
            }
        }

        return earliestConflict;
    }


    function formatShowConflictMessage(conflict) {
        const date = new Intl.DateTimeFormat('en-ZA', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC'
        }).format(new Date(`${conflict.date}T00:00:00Z`));

        return `There's already a show on ${date} from ${conflict.startTime} to ${conflict.endTime}: ${conflict.show.name}. Choose another time or date.`;
    }

    async function saveShow() {

        const presenter =
            getFieldValue('field-presenter');

        const dates = [...pickerDates].sort();

        const time =
            getFieldValue('field-time');

        const {
            start,
            end
        } = getTimeParts(time);


        if (!start || !end) {

            throw new Error(
                'Please enter a valid time range, for example 09:00 – 12:00.'
            );
        }


        if (!dates.length) {

            throw new Error(
                'Pick at least one date for this show.'
            );
        }

        const conflict = findShowScheduleConflict({
            dates,
            startTime: start,
            endTime: end,
            excludeId: editingItem?.id
        });

        if (conflict) {
            throw new Error(formatShowConflictMessage(conflict));
        }

        const imageField =
            document.getElementById('field-image');

        let image = editingItem?.image || '';

        if (imageField?.files?.[0]) {
            const upload = new FormData();
            upload.append('image', imageField.files[0]);
            const result = await apiRequest('/shows/image', {
                method: 'POST',
                body: upload
            });
            image = result?.url || result?.path || '';
        }


        const payload = {
            dates,

            start_time:
                start,

            end_time:
                end,

            name:
                getFieldValue('field-name'),

            title:
                getFieldValue('field-title'),

            description:
                getFieldValue('field-description'),

            image,

            presenter,

            initials:
                getInitials(presenter),

            tone:
                editingItem?.tone ||
                'blue'
        };


        await apiRequest(
            editingItem
                ? `/shows/${editingItem.id}`
                : '/shows',
            {
                method:
                    editingItem
                        ? 'PUT'
                        : 'POST',

                body: payload
            }
        );
    }


    // ============================================================
    // SONG SAVE
    // ============================================================

    async function saveSong() {

        const imageField =
            document.getElementById(
                'field-song-image'
            );

        let image =
            editingItem?.image || '';


        if (
            imageField &&
            imageField.files &&
            imageField.files[0]
        ) {

            const upload =
                new FormData();

            upload.append(
                'image',
                imageField.files[0]
            );

            const result =
                await apiRequest(
                    '/songs/image',
                    {
                        method: 'POST',
                        body: upload
                    }
                );

            image =
                result?.url ||
                result?.path ||
                '';
        }


        const rank =
            Number(
                getFieldValue('field-song-rank')
            );

        if (!Number.isInteger(rank) || rank < 1 || rank > 10) {
            throw new Error('Top 10 position must be a whole number from 1 to 10.');
        }

        const visibleField =
            document.getElementById('field-song-visible');

        const payload = {
            rank,

            title:
                getFieldValue(
                    'field-title'
                ),

            artist:
                getFieldValue(
                    'field-artist'
                ),

            plays:
                Number(
                    getFieldValue(
                        'field-plays'
                    )
                ) || 0,

            image,

            visible:
                visibleField
                    ? visibleField.checked
                    : true
        };


        await apiRequest(
            editingItem
                ? `/songs/${editingItem.id}`
                : '/songs',
            {
                method:
                    editingItem
                        ? 'PUT'
                        : 'POST',

                body: payload
            }
        );
    }


    // ============================================================
    // POST SAVE
    // ============================================================

    async function savePost() {

        const imageField =
            document.getElementById(
                'field-post-image'
            );

        let image =
            editingItem?.image || '';


        if (
            imageField &&
            imageField.files &&
            imageField.files[0]
        ) {

            const upload =
                new FormData();

            upload.append(
                'image',
                imageField.files[0]
            );

            const result =
                await apiRequest(
                    '/posts/image',
                    {
                        method: 'POST',
                        body: upload
                    }
                );

            image =
                result?.url ||
                result?.path ||
                '';
        }


        const payload = {
            type:
                getFieldValue(
                    'field-type'
                ),

            status:
                getFieldValue(
                    'field-status'
                ),

            title:
                getFieldValue(
                    'field-title'
                ),

            excerpt:
                getFieldValue(
                    'field-excerpt'
                ),

            body:
                getEditorValue(),

            image
        };


        await apiRequest(
            editingItem
                ? `/posts/${editingItem.id}`
                : '/posts',
            {
                method:
                    editingItem
                        ? 'PUT'
                        : 'POST',

                body: payload
            }
        );
    }


    // ============================================================
    // DELETE ACTIONS
    // ============================================================

    async function deleteShow(index) {

        const show =
            data.shows[index];

        if (!show?.id) {
            return;
        }

        if (
            !window.confirm(
                `Delete "${show.title || show.name}"?`
            )
        ) {
            return;
        }

        closeShowDetails();

        await apiRequest(
            `/shows/${show.id}`,
            {
                method: 'DELETE'
            }
        );

        await loadData();

        renderAll();
    }


    async function deleteSong(index) {

        const song =
            data.songs[index];

        if (!song?.id) {
            return;
        }

        if (
            !window.confirm(
                `Delete "${song.title}"?`
            )
        ) {
            return;
        }

        await apiRequest(
            `/songs/${song.id}`,
            {
                method: 'DELETE'
            }
        );

        await loadData();

        renderAll();
    }


    async function deletePost(index) {

        const post =
            data.posts[index];

        if (!post?.id) {
            return;
        }

        if (
            !window.confirm(
                `Delete "${post.title}"?`
            )
        ) {
            return;
        }

        await apiRequest(
            `/posts/${post.id}`,
            {
                method: 'DELETE'
            }
        );

        await loadData();

        renderAll();
    }


    function handleDelete(event) {

        const target =
            event.target.closest(
                '[data-delete-show], [data-delete-song], [data-delete-post]'
            );

        if (!target) {
            return;
        }


        if (
            target.dataset.deleteShow !==
            undefined
        ) {

            deleteShow(
                Number(
                    target.dataset.deleteShow
                )
            ).catch(console.error);

            return;
        }


        if (
            target.dataset.deleteSong !==
            undefined
        ) {

            deleteSong(
                Number(
                    target.dataset.deleteSong
                )
            ).catch(console.error);

            return;
        }


        if (
            target.dataset.deletePost !==
            undefined
        ) {

            deletePost(
                Number(
                    target.dataset.deletePost
                )
            ).catch(console.error);
        }
    }


    // ============================================================
    // EDIT ACTIONS
    // ============================================================

    function handleEdit(event) {

        const target =
            event.target.closest(
                '[data-edit-type]'
            );

        if (!target) {
            return;
        }

        const index =
            Number(
                target.dataset.editIndex
            );

        const type =
            target.dataset.editType;

        const collection =
            type === 'show'
                ? data.shows
                : type === 'song'
                    ? data.songs
                    : data.posts;

        const item =
            collection[index];

        if (!item) {
            return;
        }

        openEditModal(
            type,
            item
        );
    }


    // ============================================================
    // ACTION MENUS
    // ============================================================

    function handleActionMenu(event) {

        const button =
            event.target.closest(
                '.row-actions'
            );

        document
            .querySelectorAll(
                '.action-menu.is-open'
            )
            .forEach(menu => {

                if (
                    !button ||
                    menu !== button.parentElement
                ) {
                    menu.classList.remove(
                        'is-open'
                    );
                }
            });


        if (button) {

            button.parentElement.classList.toggle(
                'is-open'
            );
        }
    }


    // ============================================================
    // NAVIGATION
    // ============================================================

    const PAGE_TITLES = {

        schedule:
            'Plan the day',

        music:
            'Keep it in tune',

        news:
            'Make the news'
    };


    function getGreeting() {

        const hour = new Date().getHours();

        if (hour < 12) {
            return 'Good morning';
        }

        if (hour < 17) {
            return 'Good afternoon';
        }

        return 'Good evening';
    }


    function navigateTo(section) {

        updateSidebar(section);

        updatePanels(section);

        updatePageHeading(section);
    }


    function updateSidebar(section) {

        document
            .querySelectorAll(
                '.side-link[data-section]'
            )
            .forEach(link => {

                link.classList.toggle(
                    'active',
                    link.dataset.section === section
                );
            });
    }


    function updatePanels(section) {

        document
            .querySelectorAll(
                '.content-section'
            )
            .forEach(panel => {

                panel.classList.toggle(
                    'active',
                    panel.dataset.panel === section
                );
            });
    }


    function updatePageHeading(section) {

        if (!elements.pageHeading) {
            return;
        }

        const firstName =
            (
                data.user?.full_name ||
                'Station manager'
            )
                .split(' ')[0];

        const title =
            section === 'overview'
                ? `${getGreeting()}, ${firstName}`
                : PAGE_TITLES[section] ||
                    `${getGreeting()}, ${firstName}`;

        elements.pageHeading.innerHTML =
            `${escapeHtml(title)} <span>✦</span>`;
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
            .querySelectorAll(
                '.filter-button'
            )
            .forEach(item => {

                item.classList.remove(
                    'active'
                );
            });

        button.classList.add('active');

        renderPosts(
            button.dataset.filter ||
            'all'
        );
    }


    // ============================================================
    // RICH TEXT EDITOR
    // ============================================================

    function handleEditorToolbar(event) {

        const button =
            event.target.closest(
                '[data-editor-command]'
            );

        if (!button) {
            return;
        }

        const editor =
            document.getElementById(
                'field-body'
            );

        if (!editor) {
            return;
        }

        editor.focus();

        const command =
            button.dataset.editorCommand;

        const value =
            button.dataset.editorValue ||
            null;


        if (command === 'createLink') {

            const url =
                window.prompt(
                    'Enter the link URL'
                );

            if (!url) {
                return;
            }

            document.execCommand(
                command,
                false,
                url
            );

            return;
        }


        document.execCommand(
            command,
            false,
            value
        );
    }


    // ============================================================
    // EVENT LISTENERS
    // ============================================================

    function setupEventListeners() {

        const scheduleToolbar =
            document.querySelector('.toolbar');

        const scheduleCalendar =
            document.querySelector('.schedule-table');

        if (scheduleToolbar) {
            scheduleToolbar.addEventListener('click', event => {
                const target = event.target.closest('button');

                if (!target) {
                    return;
                }

                if (target.dataset.calendarWeek) {
                    activeWeekOffset += Number(target.dataset.calendarWeek);
                    renderFullSchedule();
                } else if (target.hasAttribute('data-calendar-today')) {
                    activeWeekOffset = 0;
                    renderFullSchedule();
                }
            });
        }

        if (scheduleCalendar) {
            scheduleCalendar.addEventListener('click', event => {
                const target = event.target.closest('[data-calendar-show]');

                if (!target) {
                    return;
                }

                openShowDetails(Number(target.dataset.calendarShow));
            });
        }

        // --------------------------------------------------------
        // Authentication
        // --------------------------------------------------------

        if (elements.loginForm) {

            elements.loginForm.addEventListener(
                'submit',
                handleLogin
            );
        }


        if (elements.logoutButton) {

            elements.logoutButton.addEventListener(
                'click',
                handleLogout
            );
        }


        // --------------------------------------------------------
        // Add buttons
        // --------------------------------------------------------

        if (elements.addShowButton) {

            elements.addShowButton.addEventListener(
                'click',
                () => openModal('show')
            );
        }


        if (elements.addSongButton) {

            elements.addSongButton.addEventListener(
                'click',
                () => openModal('song')
            );
        }


        if (elements.addPostButton) {

            elements.addPostButton.addEventListener(
                'click',
                () => openModal('post')
            );
        }


        // --------------------------------------------------------
        // Modal
        // --------------------------------------------------------

        if (
            elements.modal &&
            elements.modalClose
        ) {

            elements.modalClose.addEventListener(
                'click',
                closeModal
            );


            elements.modal.addEventListener(
                'click',
                event => {

                    if (
                        event.target ===
                        elements.modal
                    ) {
                        closeModal();
                    }
                }
            );
        }


        if (
            elements.showDetails &&
            elements.showDetailsClose
        ) {

            elements.showDetailsClose.addEventListener(
                'click',
                closeShowDetails
            );


            elements.showDetails.addEventListener(
                'click',
                event => {

                    if (
                        event.target ===
                        elements.showDetails
                    ) {
                        closeShowDetails();
                    }
                }
            );
        }


        if (elements.itemForm) {

            elements.itemForm.addEventListener(
                'submit',
                handleItemSubmit
            );
        }


        // --------------------------------------------------------
        // Global actions
        // --------------------------------------------------------

        document.addEventListener(
            'click',
            handleDelete
        );

        document.addEventListener(
            'click',
            handleEdit
        );

        document.addEventListener(
            'click',
            handleActionMenu
        );

        document.addEventListener(
            'click',
            handleEditorToolbar
        );


        // --------------------------------------------------------
        // Navigation
        // --------------------------------------------------------

        document
            .querySelectorAll(
                '.side-link[data-section], [data-jump]'
            )
            .forEach(button => {

                button.addEventListener(
                    'click',
                    () => handleNavigation(button)
                );
            });


        // --------------------------------------------------------
        // News filters
        // --------------------------------------------------------

        document
            .querySelectorAll(
                '.filter-button'
            )
            .forEach(button => {

                button.addEventListener(
                    'click',
                    () => handleNewsFilter(button)
                );
            });


        // --------------------------------------------------------
        // Escape key
        // --------------------------------------------------------

        document.addEventListener(
            'keydown',
            event => {

                if (event.key !== 'Escape') {
                    return;
                }

                if (
                    elements.showDetails &&
                    !elements.showDetails.hidden
                ) {
                    closeShowDetails();
                    return;
                }

                if (activeModal) {
                    closeModal();
                }
            }
        );
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

                console.error(
                    'Failed to load station data:',
                    error
                );

                handleLogout();

                return;
            }


            if (elements.dashboard) {

                showDashboard();

            } else if (elements.loginView) {

                window.location.href =
                    'overview.html';
            }

        } else {

            if (elements.loginView) {

                showLogin();

            } else {

                window.location.href =
                    'login.html';
            }
        }
    }


    // Start application.
    init();

})();