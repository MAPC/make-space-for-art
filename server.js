import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(express.json())

// API endpoint to get Mapbox token 
app.get('/api/mapbox-token', (req, res) => {
  // get mapbox token 
  const token =  process.env.VITE_MAPBOX_ACCESS_TOKEN
  
  if (!token) {
    console.error('Mapbox token not found in environment variables')
    return res.status(500).json({ error: 'Mapbox token not configured' })
  }
  
  res.json({ token })
})

// API endpoint to proxy ArcGIS Feature Service 
app.get('/api/features', async (req, res) => {
  const FEATURE_SERVICE_URL = process.env.VITE_FEATURE_SERVICE_URL

   
  
  try {
    const queryParams = new URLSearchParams({
      where: '1=1',
      outFields: '*',
      outSR: '4326',
      f: 'geojson',
      returnGeometry: 'true'
    })
    
    const response = await fetch(`${FEATURE_SERVICE_URL}/query?${queryParams}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const geojson = await response.json()
    
    if (!geojson.features) {
      throw new Error('Invalid GeoJSON response')
    }
    
    res.json(geojson.features)
  } catch (error) {
    console.error('Error fetching ArcGIS data:', error)
    res.status(500).json({ error: 'Failed to fetch data from ArcGIS service' })
  }
})

// Serve static files from the dist directory (Vite build output)
app.use(express.static(join(__dirname, 'dist')))

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

