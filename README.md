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
