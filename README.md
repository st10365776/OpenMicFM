# The Station With Progresss

Static site for The Station With Progresss.

## Project map

- `index.html`: homepage
- `about.html`: about page
- `contact.html`: contact page
- `shows.html`: shows page
- `news.html`: news page
- `local.html`: local news page
- `national-news.html`: national news page
- `sports.html`: sports page
- `entertainment.html`, `press-office.html`, `whats-new.html`: supporting pages
- `css/site.css`: shared site layout, branding, controls, and responsive rules
- `js/site.js`: small site-wide browser behavior
- `images/`: images used by the pages

## Editing guide

Put a rule in `css/site.css` when it affects more than one page. Keep page-specific rules in the page's own content only when the page genuinely differs. Update navigation with relative `.html` links so pages continue working when opened directly from disk.

The primary logo is `images/logo.png`. Shared header logo sizing is controlled by `.site-header .custom-logo-link img` in `css/site.css`.

This project does not require a build step or package installation. Open `index.html` directly in a browser, or serve the folder with any basic static file server.
