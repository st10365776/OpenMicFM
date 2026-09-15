(function () {
    'use strict';

    const API_URL = 'http://localhost:4000/api/shows';
    const listenUrl = 'http://p.onlineradiobox.com/za/nkqubela/player/?cs=za.nkqubela&played=1';
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
        return days.some(day => ['Sat', 'Sun', 'Saturday', 'Sunday'].includes(day));
    }

    function isWeekday(show) {
        const days = show.days_of_week || [show.day_of_week];
        return days.some(day => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day));
    }

    function showDays(show) {
        return (show.days_of_week || [show.day_of_week]).join(' / ');
    }

    function imageUrl(show) {
        if (!show.image) return '';
        if (show.image.startsWith('/uploads/')) return `http://localhost:4000${show.image}`;
        return show.image.startsWith('http') ? show.image : `./images/${show.image}`;
    }

    function render() {
        if (!cards) return;

        const filteredShows = shows.filter(show => activeFilter === 'weekends' ? isWeekend(show) : isWeekday(show));
        cards.innerHTML = filteredShows.length
            ? filteredShows.map(show => `
                <article class="show-card">
                    <div class="show-card-image">
                        ${imageUrl(show) ? `<img src="${escapeHtml(imageUrl(show))}" alt="${escapeHtml(show.title || show.name)}">` : '<span class="show-card-placeholder">OPENMIC FM</span>'}
                    </div>
                    <div class="show-card-content">
                        <p class="show-card-day">${escapeHtml(showDays(show))}</p>
                        <h2>${escapeHtml(show.title || show.name)}</h2>
                        <p class="show-card-presenter">${escapeHtml(show.presenter)}</p>
                        <p class="show-card-description">${escapeHtml(show.description || 'Music, conversation and community from OpenMic FM.')}</p>
                        <p class="show-card-time">${escapeHtml(show.time || `${show.start_time} - ${show.end_time}`)}</p>
                        <a class="show-card-button" href="${listenUrl}" target="_blank" rel="noopener">Listen Now Live</a>
                    </div>
                </article>
            `).join('')
            : '<p class="show-card-empty">No shows are scheduled for this filter yet.</p>';
    }

    async function loadShows() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Shows could not be loaded.');
            shows = await response.json();
            render();
        } catch (error) {
            cards.innerHTML = '<p class="show-card-empty">Shows are temporarily unavailable. Please try again shortly.</p>';
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            activeFilter = tab.dataset.showFilter;
            tabs.forEach(item => item.classList.toggle('is-active', item === tab));
            render();
        });
    });

    if (app) loadShows();
})();
