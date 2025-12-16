import { useEffect, useState, useCallback } from 'react'
import Map, { Marker, Popup, Source, Layer, NavigationControl } from 'react-map-gl'
import { fetchNeighborhoodData } from '../utils/arcgis'
import 'mapbox-gl/dist/mapbox-gl.css'
import './Map.css'

function MapComponent({ data, loading, selectedFeature, onMarkerSelect, selectedCity }) {
  const [viewState, setViewState] = useState({
    longitude: -74.0060,
    latitude: 40.7128,
    zoom: 12
  })
  const [selectedMarker, setSelectedMarker] = useState(null)
  const [mapError, setMapError] = useState(null)
  const [mapboxToken, setMapboxToken] = useState(null)
  const [highlightedCities, setHighlightedCities] = useState(null)
  const [massachusettsGeoJSON, setMassachusettsGeoJSON] = useState(null)
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/light-v11')
  const [bostonNeighborhoods, setBostonNeighborhoods] = useState(null)
  const [cambridgeNeighborhoods, setCambridgeNeighborhoods] = useState(null)
  const [somervilleNeighborhoods, setSomervilleNeighborhoods] = useState(null)

  const mapStyles = [
    { value: 'mapbox://styles/mapbox/light-v11', label: 'Light' },
    { value: 'mapbox://styles/mapbox/dark-v11', label: 'Dark' },
    { value: 'mapbox://styles/mapbox/streets-v12', label: 'Streets' },
    { value: 'mapbox://styles/mapbox/satellite-v9', label: 'Satellite' },
    { value: 'mapbox://styles/mapbox/satellite-streets-v12', label: 'Satellite Streets' },
    { value: 'mapbox://styles/mapbox/outdoors-v12', label: 'Outdoors' }
  ]

  // Load Mapbox token from backend API
  useEffect(() => {
    const loadMapboxToken = async () => {
      try {
        const response = await fetch('/api/mapbox-token')
        if (!response.ok) {
          throw new Error(`Failed to load Mapbox token: ${response.status}`)
        }
        const data = await response.json()
        setMapboxToken(data.token)
      } catch (error) {
        console.error('Error loading Mapbox token:', error)
        // Fallback to environment variable for development
        const fallbackToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
        if (fallbackToken) {
          setMapboxToken(fallbackToken)
        } else {
          setMapError('Mapbox token not available. Please check your configuration.')
        }
      }
    }
    loadMapboxToken()
  }, [])

  // Load Massachusetts GeoJSON file from public folder
  useEffect(() => {
    const loadGeoJSON = async () => {
      try {
        const response = await fetch('/Massachusetts.geojson')
        if (!response.ok) {
          throw new Error(`Failed to load Massachusetts GeoJSON: ${response.status}`)
        }
        const geojson = await response.json()
        setMassachusettsGeoJSON(geojson)
      } catch (error) {
        console.error('Error loading Massachusetts GeoJSON:', error)
      }
    }
    loadGeoJSON()
  }, [])

  // Load neighborhood data for Boston, Cambridge, and Somerville
  useEffect(() => {
    const loadNeighborhoods = async () => {
      try {
        const [boston, cambridge, somerville] = await Promise.all([
          fetchNeighborhoodData('Boston').catch(err => {
            console.error('Error loading Boston neighborhoods:', err)
            return null
          }),
          fetchNeighborhoodData('Cambridge').catch(err => {
            console.error('Error loading Cambridge neighborhoods:', err)
            return null
          }),
          fetchNeighborhoodData('Somerville').catch(err => {
            console.error('Error loading Somerville neighborhoods:', err)
            return null
          })
        ])

        if (boston) setBostonNeighborhoods(boston)
        if (cambridge) setCambridgeNeighborhoods(cambridge)
        if (somerville) setSomervilleNeighborhoods(somerville)
      } catch (error) {
        console.error('Error loading neighborhood data:', error)
      }
    }
    loadNeighborhoods()
  }, [])

  // Helper function to extract all coordinates from a geometry
  const extractCoordinates = (geometry) => {
    const coords = []
    
    if (geometry.type === 'Point') {
      coords.push(geometry.coordinates)
    } else if (geometry.type === 'Polygon') {
      geometry.coordinates.forEach(ring => {
        ring.forEach(coord => coords.push(coord))
      })
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach(polygon => {
        polygon.forEach(ring => {
          ring.forEach(coord => coords.push(coord))
        })
      })
    }
    
    return coords
  }

  // Calculate bounds from coordinates
  const calculateBounds = (coordinates) => {
    if (coordinates.length === 0) return null

    const lons = coordinates.map(c => c[0])
    const lats = coordinates.map(c => c[1])
    const minLon = Math.min(...lons)
    const maxLon = Math.max(...lons)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)

    const centerLon = (minLon + maxLon) / 2
    const centerLat = (minLat + maxLat) / 2

    // Calculate zoom level based on bounds
    const lonDiff = maxLon - minLon
    const latDiff = maxLat - minLat
    const maxDiff = Math.max(lonDiff, latDiff)
    
    // Calculate appropriate zoom level (increased for closer zoom)
    let zoom = 12
    if (maxDiff > 0.2) zoom = 11
    if (maxDiff > 0.4) zoom = 10
    if (maxDiff > 0.8) zoom = 9
    if (maxDiff < 0.05) zoom = 13
    if (maxDiff < 0.02) zoom = 14

    return { longitude: centerLon, latitude: centerLat, zoom }
  }

  // Update map bounds to fit highlighted city polygons (priority) or data points (fallback)
  useEffect(() => {
    let allCoordinates = []

    // Priority: Use polygon geometries if available
    if (highlightedCities?.features && highlightedCities.features.length > 0) {
      highlightedCities.features.forEach(feature => {
        if (feature.geometry) {
          const coords = extractCoordinates(feature.geometry)
          allCoordinates.push(...coords)
        }
      })
    }
    
    // Fallback: Use data point coordinates if no polygons
    if (allCoordinates.length === 0 && data.length > 0) {
      data.forEach(feature => {
        if (feature.geometry?.type === 'Point' && feature.geometry.coordinates) {
          allCoordinates.push(feature.geometry.coordinates)
        }
      })
    }

    if (allCoordinates.length > 0) {
      const bounds = calculateBounds(allCoordinates)
      if (bounds) {
        setViewState(prev => ({
          ...prev,
          ...bounds
        }))
      }
    }
  }, [highlightedCities, data])

  // Filter Massachusetts GeoJSON to highlight cities from the feature service data
  useEffect(() => {
    if (!massachusettsGeoJSON?.features || !data.length) return

    // Extract unique cities from the feature service data
    const citiesFromData = new Set(
      data
        .map(f => f.properties?.city || f.properties?.City)
        .filter(Boolean)
        .map(c => c.toUpperCase().trim())
    )

    if (citiesFromData.size === 0) {
      setHighlightedCities(null)
      return
    }

    // Filter Massachusetts features to only include cities that exist in the data
    const matchingFeatures = massachusettsGeoJSON.features.filter(feature => {
      const townName = feature.properties?.town
      if (!townName) return false
      return citiesFromData.has(townName.toUpperCase().trim())
    })

    if (matchingFeatures.length > 0) {
      setHighlightedCities({
        type: 'FeatureCollection',
        features: matchingFeatures
      })
    } else {
      setHighlightedCities(null)
    }
  }, [massachusettsGeoJSON, data])

  // Zoom to selected city polygon when city is selected
  useEffect(() => {
    if (!selectedCity || !highlightedCities?.features) return

    // Find the polygon for the selected city
    const cityPolygon = highlightedCities.features.find(feature => {
      const townName = feature.properties?.town
      if (!townName) return false
      return townName.toUpperCase().trim() === selectedCity.toUpperCase().trim()
    })

    if (cityPolygon && cityPolygon.geometry) {
      const coords = extractCoordinates(cityPolygon.geometry)
      if (coords.length > 0) {
        const bounds = calculateBounds(coords)
        if (bounds) {
          setViewState(prev => ({
            ...prev,
            ...bounds
          }))
        }
      }
    }
  }, [selectedCity, highlightedCities])

  const handleMarkerClick = useCallback((feature, event) => {
    event.originalEvent.stopPropagation()
    setSelectedMarker(feature)
    if (onMarkerSelect) {
      onMarkerSelect(feature)
    }
  }, [onMarkerSelect])

  // Sync selectedFeature prop with selectedMarker state
  useEffect(() => {
    if (selectedFeature) {
      setSelectedMarker(selectedFeature)
      // Pan to selected feature
      if (selectedFeature.geometry?.type === 'Point' && selectedFeature.geometry.coordinates) {
        const [lng, lat] = selectedFeature.geometry.coordinates
        setViewState(prev => ({
          ...prev,
          longitude: lng,
          latitude: lat,
          zoom: Math.max(prev.zoom, 14) // Zoom in if needed
        }))
      }
    }
  }, [selectedFeature])

  if (!mapboxToken) {
    return (
      <div className="map-wrapper">
        <div className="map-error">
          <h3>Loading Map...</h3>
          <p>Please wait while we load the map configuration.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="map-wrapper">
      {loading && (
        <div className="map-loading">
          <div className="loading-spinner"></div>
          <p>Loading map data...</p>
        </div>
      )}
      {mapError && (
        <div className="map-error-overlay">
          <div className="map-error">
            <h3>Map Error</h3>
            <p>{mapError}</p>
            <p>Please check your Mapbox token in the .env file.</p>
          </div>
        </div>
      )}
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
              onError={(error) => {
                console.error('Map error:', error)
                if (error.error?.status === 403) {
                  setMapError('Invalid Mapbox token. Please check your server configuration.')
                } else {
                  setMapError(error.error?.message || 'Map failed to load. Please check your Mapbox token.')
                }
              }}
              mapboxAccessToken={mapboxToken}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
      >
        {/* Map Style Selector */}
        <div className="map-style-control">
          <select
            className="map-style-select"
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value)}
          >
            {mapStyles.map(style => (
              <option key={style.value} value={style.value}>
                {style.label}
              </option>
            ))}
          </select>
        </div>

        {/* Navigation Controls */}
        <NavigationControl position="top-right" />

        {/* Highlighted cities from Massachusetts GeoJSON */}
        {highlightedCities && (
          <Source id="highlighted-cities" type="geojson" data={highlightedCities}>
            <Layer
              id="city-fill"
              type="fill"
              paint={{
                'fill-color': [
                  'case',
                  ['==', ['get', 'town'], 'BOSTON'], '#ffcccc', // Light red for Boston
                  ['==', ['get', 'town'], 'SOMERVILLE'], '#ffffcc', // Light yellow for Somerville
                  '#4a90e2' // Default blue for Cambridge and Watertown
                ],
                'fill-opacity': 0.3
              }}
            />
            <Layer
              id="city-stroke"
              type="line"
              paint={{
                'line-color': [
                  'case',
                  ['==', ['get', 'town'], 'BOSTON'], '#ff6666',
                  ['==', ['get', 'town'], 'SOMERVILLE'], '#cccc00',
                  '#4a90e2'
                ],
                'line-width': 2,
                'line-opacity': 0.6
              }}
            />
          </Source>
        )}

        {/* Boston Neighborhoods */}
        {bostonNeighborhoods && (
          <Source id="boston-neighborhoods" type="geojson" data={bostonNeighborhoods}>
            <Layer
              id="boston-neighborhoods-fill"
              type="fill"
              paint={{
                'fill-color': '#ffcccc',
                'fill-opacity': 0.1
              }}
            />
            <Layer
              id="boston-neighborhoods-stroke"
              type="line"
              paint={{
                'line-color': '#ff6666',
                'line-width': 1.5,
                'line-opacity': 0.5
              }}
            />
          </Source>
        )}

        {/* Cambridge Neighborhoods */}
        {cambridgeNeighborhoods && (
          <Source id="cambridge-neighborhoods" type="geojson" data={cambridgeNeighborhoods}>
            <Layer
              id="cambridge-neighborhoods-fill"
              type="fill"
              paint={{
                'fill-color': '#4a90e2',
                'fill-opacity': 0.1
              }}
            />
            <Layer
              id="cambridge-neighborhoods-stroke"
              type="line"
              paint={{
                'line-color': '#4a90e2',
                'line-width': 1.5,
                'line-opacity': 0.5
              }}
            />
          </Source>
        )}

        {/* Somerville Neighborhoods */}
        {somervilleNeighborhoods && (
          <Source id="somerville-neighborhoods" type="geojson" data={somervilleNeighborhoods}>
            <Layer
              id="somerville-neighborhoods-fill"
              type="fill"
              paint={{
                'fill-color': '#ffffcc',
                'fill-opacity': 0.1
              }}
            />
            <Layer
              id="somerville-neighborhoods-stroke"
              type="line"
              paint={{
                'line-color': '#cccc00',
                'line-width': 1.5,
                'line-opacity': 0.5
              }}
            />
          </Source>
        )}

        {/* Markers for each space */}
        {data.map((feature, index) => {
          if (feature.geometry?.type === 'Point' && feature.geometry.coordinates) {
            const [lng, lat] = feature.geometry.coordinates
            const props = feature.properties || {}
            const currentSelected = selectedFeature || selectedMarker
            const isSelected = currentSelected && 
              currentSelected.geometry?.coordinates[0] === lng && 
              currentSelected.geometry?.coordinates[1] === lat

            return (
              <Marker
                key={index}
                longitude={lng}
                latitude={lat}
                anchor="center"
                onClick={(e) => handleMarkerClick(feature, e)}
              >
                <div className={`custom-marker ${isSelected ? 'highlighted' : ''}`}>
                  <svg
                    width={isSelected ? "12" : "8"}
                    height={isSelected ? "12" : "8"}
                    viewBox="0 0 8 8"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="4"
                      cy="4"
                      r={isSelected ? "4" : "3"}
                      fill={isSelected ? "#4a90e2" : "#ff0000"}
                    />
                  </svg>
                </div>
              </Marker>
            )
          }
          return null
        })}

        {/* Popup for selected marker */}
        {(selectedFeature || selectedMarker) && (selectedFeature || selectedMarker).geometry?.type === 'Point' && (
          <Popup
            longitude={(selectedFeature || selectedMarker).geometry.coordinates[0]}
            latitude={(selectedFeature || selectedMarker).geometry.coordinates[1]}
            anchor="bottom"
            offset={[0, -10]}
            onClose={() => {
              setSelectedMarker(null)
              if (onMarkerSelect) {
                onMarkerSelect(null)
              }
            }}
            closeOnClick={false}
            closeButton={true}
            style={{ maxWidth: '400px', zIndex: 999 }}
          >
            <div className="popup-content">
              {((selectedFeature || selectedMarker).properties?.name) && (
                <h3 className="popup-title">{(selectedFeature || selectedMarker).properties.name}</h3>
              )}
              <table className="popup-table">
                <tbody>
                  {Object.entries((selectedFeature || selectedMarker).properties || {})
                    .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                    .map(([key, value], index) => {
                      // Format the value
                      let displayValue = value
                      if (typeof value === 'object') {
                        displayValue = JSON.stringify(value)
                      } else {
                        displayValue = String(value)
                      }
                      
                      return (
                        <tr key={`${key}-${index}`}>
                          <td className="popup-label">{key}:</td>
                          <td className="popup-value">{displayValue}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}

export default MapComponent