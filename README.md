# OpenMicFM Website

OpenMicFM is the official website for **The Station With Progress** — a community radio station based in Gqeberha, South Africa. The website provides listeners with access to station information, radio shows, local and national news, sports updates, entertainment, and the latest community developments.

The project is built using HTML, CSS, and JavaScript, with a responsive layout and shared styling across multiple pages.

## Features

- **Homepage:** An introduction to OpenMicFM and its latest content.
- **About:** Information about the station, its mission, and its community.
- **Shows:** A dedicated page for radio programmes and show information.
- **News:** News articles and updates relevant to listeners.
- **Local News:** Coverage of local developments and community stories.
- **National News:** News and current affairs from across South Africa.
- **Sports:** Sports news, updates, and coverage.
- **Entertainment:** Entertainment stories and updates.
- **Press Office:** A dedicated section for press-related information.
- **What's New:** The latest updates and developments from the station.
- **Contact:** Contact information and a way for visitors to connect with the station.
- **Responsive design:** Shared styling designed to support different screen sizes.
- **Consistent navigation:** Relative HTML links allow pages to work together without a frontend framework or build process.

## Technology Stack

- **HTML5** — Page structure and content.
- **CSS3** — Layout, branding, responsive styling, and reusable UI components.
- **JavaScript** — Site-wide browser interactions and functionality.
- **PNG/JPG and other web images** — Station branding and visual content.

## Project Structure

```text
OpenMicFM-Website/
├── index.html
├── about.html
├── contact.html
├── shows.html
├── news.html
├── local.html
├── national-news.html
├── sports.html
├── entertainment.html
├── press-office.html
├── whats-new.html
├── css/
│   └── site.css
├── js/
│   └── site.js
└── images/
    └── logo.png
```

*Additional images and assets may be present in the `images/` directory.*

## Getting Started

### Prerequisites

You only need a modern web browser. No Node.js installation, package manager, or build tools are required.

### Run Locally

1. Clone the repository:

   ```bash
   git clone YOUR_REPOSITORY_URL
   ```

2. Open the project folder.
3. Open `index.html` in your browser.

Alternatively, use Visual Studio Code with the Live Server extension to preview the website through a local development server.

## Development Guidelines

### Shared Styling

Global styles belong in `css/site.css`. Use this file for shared elements such as:

- Header and navigation
- Logo sizing and positioning
- Typography and colours
- Buttons and interactive controls
- Page layouts and responsive behaviour

Keep page-specific styling separate when a page genuinely requires a different layout.

### JavaScript

Use `js/site.js` for reusable browser-side behaviour that applies across the website. Keep functionality simple and avoid duplicating site-wide logic across individual pages.

### Navigation

Use relative links for internal pages:

```html
<a href="about.html">About</a>
<a href="shows.html">Shows</a>
<a href="contact.html">Contact</a>
```

This keeps navigation compatible with direct browser access and static hosting.

### Branding

The primary station logo is located at:

```text
images/logo.png
```

The shared header logo dimensions are controlled by the `.site-header .custom-logo-link img` selector in `css/site.css`.

## Deployment

The website can be deployed to any static web hosting provider, including:

- Microsoft Azure Static Web Apps
- GitHub Pages
- Netlify
- Cloudflare Pages

Deployment requirements depend on the selected provider. A static hosting service is sufficient for the website's HTML, CSS, JavaScript, and image assets.

## Future Improvements

Potential enhancements include:

- Live radio streaming integration.
- Dynamic news and sports content.
- Improved search and content discovery.
- Accessibility and performance optimisation.
- Integration with the OpenMicFM mobile application and backend API.
- A content management system for publishing updates more efficiently.

## Project Purpose

OpenMicFM aims to strengthen community engagement by providing a central online destination for radio programming, local news, sports, entertainment, and station updates.

---

**OpenMicFM — The Station With Progress.**

Made for the community of Gqeberha, South Africa.
