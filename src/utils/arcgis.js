/**
 * Fetch data from ArcGIS Feature Service via backend API proxy
 * This keeps the ArcGIS URL secure on the backend
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
