(function () {
    'use strict';

    // Azure serves the API from the same domain as the website.
    const API_URL = '/api/shows';

    const listenUrl =
        'http://p.onlineradiobox.com/za/nkqubela/player/?cs=za.nkqubela&played=1';

    const app = document.getElementById('shows-app');
    const tabs = app ? app.querySelectorAll('[data-show-filter]') : [];
    const cards = app ? app.querySelector('[data-show-cards]') : null;

    let shows = [];
    let activeFilter = 'weekdays';

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>'"]/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#039;',
            '"': '&quot;'
        }[character]));
    }

    function isWeekend(show) {
        const days = show.days_of_week || [show.day_of_week];

        return days.some(day =>
            ['Sat', 'Sun', 'Saturday', 'Sunday'].includes(day)
        );
    }

    function isWeekday(show) {
        const days = show.days_of_week || [show.day_of_week];

        return days.some(day =>
            [
                'Mon',
                'Tue',
                'Wed',
                'Thu',
                'Fri',
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday'
            ].includes(day)
        );
    }

    function showDays(show) {
        return (show.days_of_week || [show.day_of_week]).join(' / ');
    }

    function imageUrl(show) {
        if (!show.image) {
            return '';
        }

        // Images uploaded through the API.
        if (show.image.startsWith('/uploads/')) {
            return show.image;
        }

        // Full external image URL.
        if (show.image.startsWith('http')) {
            return show.image;
        }

        // Images stored in the website's images folder.
        return `./images/${show.image}`;
    }

    function formatTime(time) {
        if (!time) {
            return '';
        }

        // Convert PostgreSQL time such as 06:00:00 to 06:00
        return String(time).substring(0, 5);
    }

    function render() {
        if (!cards) {
            return;
        }

        const filteredShows = shows.filter(show => {
            if (activeFilter === 'weekends') {
                return isWeekend(show);
            }

            return isWeekday(show);
        });

        if (!filteredShows.length) {
            cards.innerHTML =
                '<p class="show-card-empty">No shows are scheduled for this filter yet.</p>';

            return;
        }

        cards.innerHTML = filteredShows.map(show => {
            const title = show.title || show.name || 'OpenMic FM Show';
            const presenter = show.presenter || 'OpenMic FM';
            const description =
                show.description ||
                'Music, conversation and community from OpenMic FM.';

            const image = imageUrl(show);

            const time = show.time ||
                `${formatTime(show.start_time)} - ${formatTime(show.end_time)}`;

            return `
                <article class="show-card">

                    <div class="show-card-image">
                        ${
                            image
                                ? `
                                    <img
                                        src="${escapeHtml(image)}"
                                        alt="${escapeHtml(title)}"
                                        loading="lazy"
                                    >
                                `
                                : `
                                    <span class="show-card-placeholder">
                                        OPENMIC FM
                                    </span>
                                `
                        }
                    </div>

                    <div class="show-card-content">

                        <p class="show-card-day">
                            ${escapeHtml(showDays(show))}
                        </p>

                        <h2>
                            ${escapeHtml(title)}
                        </h2>

                        <p class="show-card-presenter">
                            ${escapeHtml(presenter)}
                        </p>

                        <p class="show-card-description">
                            ${escapeHtml(description)}
                        </p>

                        <p class="show-card-time">
                            ${escapeHtml(time)}
                        </p>

                        <a
                            class="show-card-button"
                            href="${listenUrl}"
                            target="_blank"
                            rel="noopener"
                        >
                            Listen Now Live
                        </a>

                    </div>

                </article>
            `;
        }).join('');
    }

    async function loadShows() {
        if (!cards) {
            console.error('Shows app/card container was not found.');
            return;
        }

        try {
            cards.innerHTML =
                '<p class="show-card-empty">Loading shows...</p>';

            const response = await fetch(API_URL, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(
                    `Shows API returned HTTP ${response.status}`
                );
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error('Shows API returned an invalid response.');
            }

            shows = data;

            console.log(`Loaded ${shows.length} shows from ${API_URL}`);

            render();

        } catch (error) {
            console.error('Unable to load shows:', error);

            cards.innerHTML = `
                <p class="show-card-empty">
                    Shows are temporarily unavailable.
                    Please try again shortly.
                </p>
            `;
        }
    }

    // Weekday / weekend filter buttons
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            activeFilter = tab.dataset.showFilter;

            tabs.forEach(item => {
                item.classList.toggle('is-active', item === tab);
            });

            render();
        });
    });

    // Load shows when the page is ready.
    if (app) {
        loadShows();
    } else {
        console.error(
            'Could not find #shows-app on the Shows page.'
        );
    }

})();