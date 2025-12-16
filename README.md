# Make Space for Art - Arts Spaces Map

A React application that visualizes arts spaces on an interactive map using data from an ArcGIS Feature Service.

## Features

- **Interactive Map**: 80% of the screen showing all arts spaces as markers
- **Metrics Panel**: 20% panel showing statistics and filters
- **City Polygons**: Visual representation of city boundaries based on data points
- **Filtering**: Dropdown filters for cities and neighborhoods
- **Real-time Statistics**: Dynamic metrics based on selected filters

## Tech Stack

- React 18
- Vite
- React-Leaflet
- Leaflet
- ArcGIS Feature Service API

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up Mapbox token (optional but recommended):
   - Create a `.env` file in the root directory
   - Add your Mapbox access token: `VITE_MAPBOX_TOKEN=your_token_here`
   - Get your token from [Mapbox](https://account.mapbox.com/access-tokens/)
   - Note: The app includes a default public token, but using your own is recommended

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

## Data Source

The application fetches data from:
https://services.arcgis.com/c5WwApDsDjRhIVkH/arcgis/rest/services/airtable_synced_arts_spaces/FeatureServer

## Project Structure

```
src/
  ├── components/
  │   ├── Map.jsx          # Main map component
  │   ├── Map.css
  │   ├── MetricsPanel.jsx # Statistics and filters panel
  │   └── MetricsPanel.css
  ├── utils/
  │   └── arcgis.js        # ArcGIS API utilities
  ├── App.jsx              # Main app component
  ├── App.css
  ├── main.jsx             # Entry point
  └── index.css            # Global styles
```

## Usage

- Use the city dropdown to filter spaces by city
- Use the neighborhood dropdown to filter by neighborhood (requires city selection)
- Click on markers to see detailed information about each space
- City polygons are automatically generated based on the data points
