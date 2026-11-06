(function () {
  'use strict';

  const API_URL = '/api/listeners';
  const loginTab = document.getElementById('login-tab');
  const signupTab = document.getElementById('signup-tab');
  const loginPanel = document.getElementById('login-panel');
  const signupPanel = document.getElementById('signup-panel');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const googleButton = document.getElementById('google-button');
  const googleMessage = document.getElementById('google-message');

  function setMessage(element, message, isSuccess) {
    element.textContent = message;
    element.classList.toggle('is-success', Boolean(isSuccess));
  }

  function setTab(activeTab) {
    const showLogin = activeTab === loginTab;
    loginTab.classList.toggle('is-active', showLogin);
    signupTab.classList.toggle('is-active', !showLogin);
    loginTab.setAttribute('aria-selected', String(showLogin));
    signupTab.setAttribute('aria-selected', String(!showLogin));
    loginPanel.hidden = !showLogin;
    signupPanel.hidden = showLogin;
  }

  async function readResponse(response) {
    let data;
    try {
      data = await response.json();
    } catch {
      if (!response.ok) {
        throw new Error(`The API returned HTTP ${response.status}. Make sure the listener API is running.`);
      }
      throw new Error('The server returned an unreadable response. Please try again.');
    }

    if (!response.ok) {
      throw new Error(data.error || 'Your request could not be completed.');
    }
    return data;
  }

  function completeSignIn(data, messageElement) {
    if (!data.token || !data.user) {
      throw new Error('The server response did not include a valid listener session.');
    }

    localStorage.setItem('openmicfmListenerToken', data.token);
    localStorage.setItem('openmicfmListenerUser', JSON.stringify(data.user));
    setMessage(messageElement, 'You’re in. Taking you back to OpenMicFM…', true);
    window.setTimeout(function () {
      window.location.assign('./listener-profile.html');
    }, 900);
  }

  async function submitForm(form, path, messageElement) {
    if (!form.reportValidity()) {
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    setMessage(messageElement, '', false);

    try {
      const response = await fetch(`${API_URL}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      completeSignIn(await readResponse(response), messageElement);
    } catch (error) {
      setMessage(messageElement, error.message || 'Unable to reach the server. Please try again.', false);
    } finally {
      submitButton.disabled = false;
    }
  }

  async function submitGoogleCredential(credential) {
    setMessage(googleMessage, 'Verifying your Google account…', true);

    try {
      const response = await fetch(`${API_URL}/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });
      completeSignIn(await readResponse(response), googleMessage);
    } catch (error) {
      setMessage(googleMessage, error.message || 'Unable to reach the server. Please try again.', false);
    }
  }

  function loadGoogleSignIn(clientId) {
    if (!clientId) {
      setMessage(googleMessage, 'Google sign-in is not configured yet.', false);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = function () {
      if (!window.google || !window.google.accounts || !window.google.accounts.id) {
        setMessage(googleMessage, 'Google sign-in could not be loaded. Please try again later.', false);
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: function (response) {
          if (!response || !response.credential) {
            setMessage(googleMessage, 'Google did not return a sign-in credential.', false);
            return;
          }
          submitGoogleCredential(response.credential);
        }
      });
      window.google.accounts.id.renderButton(googleButton, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: Math.max(120, Math.min(320, googleButton.clientWidth || 320))
      });
      setMessage(googleMessage, '', false);
    };
    script.onerror = function () {
      setMessage(googleMessage, 'Google sign-in could not be loaded. Please try again later.', false);
    };
    document.head.appendChild(script);
  }

  loginTab.addEventListener('click', function () { setTab(loginTab); });
  signupTab.addEventListener('click', function () { setTab(signupTab); });
  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    submitForm(loginForm, 'login', document.getElementById('login-message'));
  });
  signupForm.addEventListener('submit', function (event) {
    event.preventDefault();
    submitForm(signupForm, 'register', document.getElementById('signup-message'));
  });

  fetch(`${API_URL}/google-config`)
    .then(readResponse)
    .then(function (config) { loadGoogleSignIn(config.clientId); })
    .catch(function (error) {
      setMessage(googleMessage, error.message || 'Google sign-in settings could not be loaded.', false);
    });
})();
