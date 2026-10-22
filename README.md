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

The static pages do not require a build step. The Node.js API in `server/` uses Azure SQL Database.

## Connect the API to Azure SQL

1. In `server/`, copy `.env.example` to `.env` and set `SQL_PASSWORD` and a long random `JWT_SECRET`.
2. Install and start the API from the repository root:

   ```sh
   npm --prefix server install
   npm --prefix server start
   ```

   For App Service deployments from the repository root, `npm install` runs the root `postinstall` script to restore the server dependencies.

3. The API creates the required tables in `maindb` on startup; this does not copy records from the old PostgreSQL database. To add the sample admin account and content, run `npm --prefix server run seed`.
4. In Azure Portal, open the App Service at <https://openmicfm-dxcvewf4arf0djd0.southafricanorth-01.azurewebsites.net/> and add `SQL_SERVER`, `SQL_PORT`, `SQL_DATABASE`, `SQL_USER`, `SQL_PASSWORD`, `JWT_SECRET`, and `CLIENT_ORIGIN` under **Settings > Environment variables**. Set `CLIENT_ORIGIN` to the frontend's origin with no trailing slash; if this App Service also serves the frontend, use `https://openmicfm-dxcvewf4arf0djd0.southafricanorth-01.azurewebsites.net`. Restart the app after saving.
5. In the Azure SQL logical server firewall settings, allow the App Service's outbound IP addresses. Keep the database password in App Service settings or Key Vault, never in source control.

For local development, set `CLIENT_ORIGIN=http://127.0.0.1:5500` and ensure the Azure SQL server firewall allows your current public IP address. The connection uses encryption and validates the server certificate.
