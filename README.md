# Make Space for Art - Arts Spaces Map

A React application that visualizes arts spaces on an interactive map with filtering, statistics, and data visualization capabilities.

Here is the project [introduction page](https://www.mapc.org/resource-library/making-space-for-art/)

## Features

- **Interactive Map**: 80% of the screen showing all arts spaces as markers on a Mapbox-powered map
- **Metrics Panel**: 20% panel displaying statistics, filters, and data visualizations
- **City Highlighting**: Visual representation of city boundaries from Massachusetts GeoJSON data
- **Neighborhood Layers**: Neighborhood boundaries for Boston, Cambridge, and Somerville
- **Filtering**: Dropdown filters for cities and neighborhoods with dynamic neighborhood filtering
- **Data Visualization**: Pie charts showing space types and review states
- **Sortable Data Table**: Full-width collapsible table with sortable columns
- **Marker Interaction**: Click markers to view detailed information in popups
- **Map Controls**: Zoom controls and map style selector

## Tech Stack

- **Frontend**: React 19, Vite
- **Mapping**: react-map-gl, Mapbox GL JS
- **Data Visualization**: Recharts
- **Backend**: Express.js (for API proxy and secure token management)
- **Data Sources**: ArcGIS Feature Service, Massachusetts GeoJSON, Neighborhood Feature Services

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   - Create a `.env` file in the root directory
   - Add your Mapbox access token: `VITE_MAPBOX_ACCESS_TOKEN=your_token_here`
   - Get your token from [Mapbox](https://account.mapbox.com/access-tokens/)

3. Start the development servers:

   **Terminal 1 - Backend server:**
   ```bash
   npm run dev:server
   ```

   **Terminal 2 - Frontend development server:**
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`

## Production Build

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Deployment

This application is configured for Heroku deployment:


1. Deploy:
```bash
git push heroku main
```

The `heroku-postbuild` script will automatically build the application before deployment.

## Data Sources

The application uses the following data sources:

- **Arts Spaces Data**: ArcGIS Feature Service containing arts space locations and attributes, and this feature service is synced with art spaces information in the airtable base. 
- **Massachusetts Boundaries**: GeoJSON file with Massachusetts city/town boundaries
- **Neighborhood Boundaries**: ArcGIS Feature Services for Boston, Cambridge, and Somerville neighborhoods

All data is fetched dynamically and displayed on the interactive map with filtering and visualization capabilities.

## Project Structure

```
├── server.js              # Express backend server
├── src/
│   ├── components/
│   │   ├── Map.jsx          # Main map component
│   │   ├── Map.css
│   │   ├── MetricsPanel.jsx # Statistics and filters panel
│   │   ├── MetricsPanel.css
│   │   ├── DataTable.css    # Data table styles
│   ├── utils/
│   │   └── arcgis.js        # ArcGIS API utilities
│   ├── data/
│   │   └── Massachusetts.geojson
│   ├── App.jsx              # Main app component
│   ├── App.css
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── public/
│   └── Massachusetts.geojson # Public GeoJSON file
└── Procfile                 # Heroku deployment configuration
```

## Usage

- **Filter by City**: Select a city from the dropdown to filter spaces and zoom to that city's boundaries
- **Filter by Neighborhood**: Select a neighborhood (available after selecting a city) to filter spaces
- **View Statistics**: See total spaces, review states, and space type distribution in the metrics panel
- **Interact with Map**: 
  - Click markers to view detailed information in popups
  - Use zoom controls to navigate the map
  - Change map style using the style selector
- **Explore Data Table**: Expand the data table at the bottom to view all data, sort by columns, and click rows to highlight corresponding markers on the map
