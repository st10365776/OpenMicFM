(function () {
    'use strict';

    // ============================================================
    // CONFIGURATION
    // ============================================================

    const STORAGE_KEY = 'openmicfm-station-data';
    const AUTH_KEY = 'openmicfm-auth';

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

    let data = loadData();
    let activeModal = '';


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

        scheduleList: document.getElementById('schedule-list'),
        overviewSchedule: document.getElementById('overview-schedule'),

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

    function loadData() {
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (!savedData) {
            return structuredClone(DEFAULT_DATA);
        }

        try {
            return JSON.parse(savedData);
        } catch (error) {
            console.error('Failed to load saved station data:', error);
            return structuredClone(DEFAULT_DATA);
        }
    }

    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
        return sessionStorage.getItem(AUTH_KEY) === 'true';
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

    function handleLogin(event) {
        event.preventDefault();

        const email = elements.loginEmail.value.trim();
        const password = elements.loginPassword.value;

        const validLogin =
            email === 'manager@openmicfm.co.za' &&
            password === '123';

        if (!validLogin) {
            elements.loginMessage.textContent =
                'That login does not match the local demo account.';

            return;
        }

        sessionStorage.setItem(AUTH_KEY, 'true');
        elements.loginMessage.textContent = '';

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
    }

    function renderStats() {
        if (elements.statShows) elements.statShows.textContent = data.shows.length;
        if (elements.statTracks) elements.statTracks.textContent = data.songs.length;
    }

    function renderSchedule() {
        renderFullSchedule();
        renderOverviewSchedule();
    }

    function renderFullSchedule() {
        if (!elements.scheduleList) return;

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

                    <button
                        class="row-actions"
                        type="button"
                        data-delete-show="${index}"
                        aria-label="Delete show"
                    >
                        ···
                    </button>

                </div>
            `)
            .join('');

        elements.scheduleList.innerHTML = html;
    }

    function renderOverviewSchedule() {
        if (!elements.overviewSchedule) return;

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

                        <strong>
                            ${escapeHtml(song.title)}
                        </strong>

                        <small>
                            Now in rotation
                        </small>

                    </div>

                    <span>
                        ${escapeHtml(song.artist)}
                    </span>

                    <span class="plays">
                        ${escapeHtml(song.plays)} plays
                    </span>

                    <button
                        class="row-actions"
                        type="button"
                        data-delete-song="${index}"
                        aria-label="Delete song"
                    >
                        ···
                    </button>

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
                                ${escapeHtml(post.date)}
                            </span>

                            <button
                                class="text-button"
                                type="button"
                                data-delete-post="${originalIndex}"
                            >
                                Remove
                            </button>

                        </footer>

                    </article>
                `;
            })
            .join('');

        elements.newsList.innerHTML = html;

        if (elements.allCount) elements.allCount.textContent = data.posts.length + 19;
    }


    // ============================================================
    // MODAL
    // ============================================================

    function getShowFields() {
        return `
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
                    Show name
                </label>

                <input
                    id="field-name"
                    required
                    placeholder="The Mid-Morning Mix"
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

    function closeModal() {
        elements.modal.hidden = true;
        activeModal = '';
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

    function handleItemSubmit(event) {
        event.preventDefault();

        switch (activeModal) {
            case 'show':
                addShow();
                break;

            case 'song':
                addSong();
                break;

            case 'post':
                addPost();
                break;
        }

        saveData();
        renderAll();
        closeModal();
    }

    function addShow() {
        const presenter = getFieldValue('field-presenter');

        data.shows.push({
            time: getFieldValue('field-time'),
            name: getFieldValue('field-name'),
            presenter: presenter,
            initials: getInitials(presenter),
            tone: 'blue'
        });
    }

    function addSong() {
        data.songs.push({
            title: getFieldValue('field-title'),
            artist: getFieldValue('field-artist'),
            plays: Number(getFieldValue('field-plays')) || 0
        });
    }

    function addPost() {
        data.posts.unshift({
            type: getFieldValue('field-type'),
            status: getFieldValue('field-status'),
            title: getFieldValue('field-title'),
            excerpt: getFieldValue('field-excerpt'),
            date: 'Just now'
        });
    }


    // ============================================================
    // DELETE ACTIONS
    // ============================================================

    function deleteShow(index) {
        data.shows.splice(index, 1);
        saveData();
        renderAll();
    }

    function deleteSong(index) {
        data.songs.splice(index, 1);
        saveData();
        renderAll();
    }

    function deletePost(index) {
        data.posts.splice(index, 1);
        saveData();
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
            deleteShow(Number(target.dataset.deleteShow));
        }

        if (target.dataset.deleteSong !== undefined) {
            deleteSong(Number(target.dataset.deleteSong));
        }

        if (target.dataset.deletePost !== undefined) {
            deletePost(Number(target.dataset.deletePost));
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

        const title =
            PAGE_TITLES[section] || PAGE_TITLES.overview;

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

    function init() {
        setupEventListeners();

        if (isAuthenticated()) {
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