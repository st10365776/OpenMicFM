(function () {
  'use strict';

  const API_URL = '/api/listeners';
  const tokenKey = 'openmicfmListenerToken';
  const userKey = 'openmicfmListenerUser';
  const token = localStorage.getItem(tokenKey);
  const status = document.getElementById('profile-status');
  const content = document.getElementById('favourites-content');
  const saveButton = document.getElementById('save-favourites');
  const showOptions = document.getElementById('show-options');
  const presenterOptions = document.getElementById('presenter-options');
  const selectedShowIds = new Set();
  const selectedPresenters = new Set();
  let shows = [];
  let presenters = [];
  let savedShowIds = new Set();
  let savedPresenters = new Set();

  function setStatus(message, state) {
    status.textContent = message;
    status.classList.toggle('is-error', state === 'error');
    status.classList.toggle('is-success', state === 'success');
  }

  async function readResponse(response) {
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(response.ok ? 'The server returned an unreadable response.' : `The request failed (HTTP ${response.status}).`);
    }

    if (!response.ok) {
      const error = new Error(data.error || 'The request could not be completed.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function api(path, options) {
    return fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options && options.headers)
      }
    }).then(readResponse);
  }

  function imageUrl(image) {
    if (!image) return '';
    if (image.startsWith('/') || image.startsWith('http') || image.startsWith('./') || image.startsWith('../')) {
      return image;
    }
    return `./images/${image}`;
  }

  function showTitle(show) {
    return show.title || show.name || 'OpenMic FM Show';
  }

  function updateCounts() {
    document.getElementById('show-count').textContent = `${selectedShowIds.size} selected`;
    document.getElementById('presenter-count').textContent = `${selectedPresenters.size} selected`;
    const changed = selectedShowIds.size !== savedShowIds.size ||
      [...selectedShowIds].some(id => !savedShowIds.has(id)) ||
      selectedPresenters.size !== savedPresenters.size ||
      [...selectedPresenters].some(name => !savedPresenters.has(name));
    saveButton.disabled = !changed;
    saveButton.textContent = changed ? 'Save favourites' : 'Favourites saved';
  }

  function createChoiceButton(name, subtitle, image, isSelected, onClick) {
    const button = document.createElement('button');
    button.className = 'listener-profile-choice';
    button.type = 'button';
    button.setAttribute('aria-pressed', String(isSelected));

    if (image) {
      const imageElement = document.createElement('img');
      imageElement.className = 'listener-profile-choice-image';
      imageElement.src = imageUrl(image);
      imageElement.alt = '';
      imageElement.loading = 'lazy';
      imageElement.addEventListener('error', function () {
        imageElement.replaceWith(createPlaceholder());
      }, { once: true });
      button.appendChild(imageElement);
    } else {
      button.appendChild(createPlaceholder());
    }

    const copy = document.createElement('span');
    copy.className = 'listener-profile-choice-copy';
    const title = document.createElement('strong');
    title.textContent = name;
    const detail = document.createElement('small');
    detail.textContent = subtitle;
    copy.append(title, detail);

    const mark = document.createElement('span');
    mark.className = 'listener-profile-choice-mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '✓';
    button.append(copy, mark);
    button.addEventListener('click', onClick);
    return button;
  }

  function createPlaceholder() {
    const placeholder = document.createElement('span');
    placeholder.className = 'listener-profile-choice-placeholder';
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.textContent = 'OPENMIC FM';
    return placeholder;
  }

  function renderShows() {
    showOptions.replaceChildren();
    if (!shows.length) {
      const empty = document.createElement('p');
      empty.className = 'listener-profile-empty';
      empty.textContent = 'There are no shows to choose from yet.';
      showOptions.appendChild(empty);
      return;
    }

    shows.forEach(show => {
      const id = String(show.id);
      const title = showTitle(show);
      const button = createChoiceButton(
        title,
        show.presenter || 'OpenMicFM',
        show.image,
        selectedShowIds.has(id),
        function () {
          if (selectedShowIds.has(id)) selectedShowIds.delete(id);
          else selectedShowIds.add(id);
          button.setAttribute('aria-pressed', String(selectedShowIds.has(id)));
          updateCounts();
        }
      );
      showOptions.appendChild(button);
    });
  }

  function renderPresenters() {
    presenterOptions.replaceChildren();
    if (!presenters.length) {
      const empty = document.createElement('p');
      empty.className = 'listener-profile-empty';
      empty.textContent = 'There are no presenters to choose from yet.';
      presenterOptions.appendChild(empty);
      return;
    }

    presenters.forEach(name => {
      const button = document.createElement('button');
      button.className = 'listener-profile-presenter';
      button.type = 'button';
      button.textContent = name;
      button.setAttribute('aria-pressed', String(selectedPresenters.has(name)));
      button.addEventListener('click', function () {
        if (selectedPresenters.has(name)) selectedPresenters.delete(name);
        else selectedPresenters.add(name);
        button.setAttribute('aria-pressed', String(selectedPresenters.has(name)));
        updateCounts();
      });
      presenterOptions.appendChild(button);
    });
  }

  function renderProfile(user) {
    document.getElementById('profile-name').textContent = user.fullName;
    document.getElementById('profile-email').textContent = user.email;
    document.getElementById('profile-avatar').textContent = user.fullName.trim().charAt(0) || 'O';
  }

  async function loadProfile() {
    if (!token) {
      window.location.replace('./listener-auth.html');
      return;
    }

    try {
      const profile = await api('/me');
      const [showData, favorites] = await Promise.all([
        fetch('/api/shows', { headers: { Accept: 'application/json' } }).then(readResponse),
        api('/favorites')
      ]);

      if (!Array.isArray(showData)) {
        throw new Error('The shows service returned an invalid response.');
      }

      shows = showData;
      presenters = [...new Set(shows.map(show => show.presenter).filter(name => typeof name === 'string' && name.trim()))]
        .sort((a, b) => a.localeCompare(b));
      savedShowIds = new Set((favorites.showIds || []).map(String));
      savedPresenters = new Set(favorites.presenters || []);
      selectedShowIds.clear();
      selectedPresenters.clear();
      savedShowIds.forEach(id => selectedShowIds.add(id));
      savedPresenters.forEach(name => selectedPresenters.add(name));
      renderProfile(profile.user);
      renderShows();
      renderPresenters();
      content.hidden = false;
      setStatus('Choose or change your favourites, then save your selection.', '');
      updateCounts();
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(userKey);
        window.location.replace('./listener-auth.html');
        return;
      }
      setStatus(error.message || 'Your profile could not be loaded. Please try again.', 'error');
    }
  }

  saveButton.addEventListener('click', async function () {
    saveButton.disabled = true;
    setStatus('Saving your favourites…', '');
    try {
      const favorites = await api('/favorites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showIds: [...selectedShowIds].map(Number),
          presenters: [...selectedPresenters]
        })
      });
      savedShowIds = new Set(favorites.showIds.map(String));
      savedPresenters = new Set(favorites.presenters);
      setStatus('Your favourites have been saved.', 'success');
      updateCounts();
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(userKey);
        window.location.replace('./listener-auth.html');
        return;
      }
      setStatus(error.message || 'Your favourites could not be saved. Please try again.', 'error');
      updateCounts();
    }
  });

  document.getElementById('signout-button').addEventListener('click', function () {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    window.location.replace('./index.html');
  });

  loadProfile();
})();
