  // Public ArcGIS Feature Service URL - safe to expose in frontend
  /**
 * Fetch data from ArcGIS Feature Service via backend API proxy
 * This keeps the ArcGIS URL secure on the backend (optional)
 */
export async function fetchFeatureServiceData() {
  try {
    // Use backend API proxy - falls back to direct call if proxy unavailable
    const apiUrl = '/api/features'
    
    const response = await fetch(apiUrl)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const features = await response.json()
    
    if (!Array.isArray(features)) {
      throw new Error('Invalid response format')
    }
    
    return features
  } catch (error) {
    console.error('Error fetching ArcGIS data:', error)
    throw error
  }
}

/**
 * Group features by city to create polygons
 */
export function groupFeaturesByCity(features) {
  const cityGroups = {}
  
  features.forEach(feature => {
    const city = feature.properties?.city || 'Unknown'
    if (!cityGroups[city]) {
      cityGroups[city] = []
    }
    cityGroups[city].push(feature)
  })
  
  return cityGroups
}

/**
 * Create a convex hull or bounding box polygon for a group of points
 */
export function createCityPolygon(features) {
  if (features.length === 0) return null
  
  const coordinates = features
    .map(f => {
      if (f.geometry?.type === 'Point' && f.geometry.coordinates) {
        return f.geometry.coordinates
      }
      return null
    })
    .filter(Boolean)
  
  if (coordinates.length === 0) return null
  
  // Create a simple bounding box with some padding
  const lons = coordinates.map(c => c[0])
  const lats = coordinates.map(c => c[1])
  
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  
  // Add padding (about 5% of the range)
  const lonPadding = (maxLon - minLon) * 0.05 || 0.01
  const latPadding = (maxLat - minLat) * 0.05 || 0.01
  
  return {
    type: 'Polygon',
    coordinates: [[
      [minLon - lonPadding, minLat - latPadding],
      [maxLon + lonPadding, minLat - latPadding],
      [maxLon + lonPadding, maxLat + latPadding],
      [minLon - lonPadding, maxLat + latPadding],
      [minLon - lonPadding, minLat - latPadding]
    ]]
  }
}

/**
 * Fetch neighborhood data from ArcGIS Feature Service
 */
export async function fetchNeighborhoodData(city) {
  const serviceUrls = {
    'Boston': 'https://services.arcgis.com/c5WwApDsDjRhIVkH/arcgis/rest/services/Boston_Neighborhoods/FeatureServer/0',
    'Cambridge': 'https://services.arcgis.com/c5WwApDsDjRhIVkH/arcgis/rest/services/Cambridge_Neighborhoods/FeatureServer/0',
    'Somerville': 'https://services.arcgis.com/c5WwApDsDjRhIVkH/arcgis/rest/services/Somerville_Neighborhoods/FeatureServer/0'
  }

  const url = serviceUrls[city]
  if (!url) {
    throw new Error(`No neighborhood service URL found for city: ${city}`)
  }

  try {
    const response = await fetch(
      `${url}/query?where=1=1&outFields=*&outSR=4326&f=geojson&returnGeometry=true`
    )
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const geojson = await response.json()
    
    if (!geojson.features) {
      throw new Error('Invalid GeoJSON response')
    }
    
    return geojson
  } catch (error) {
    console.error(`Error fetching ${city} neighborhood data:`, error)
    throw error
  }
}
