import { useEffect, useState, useCallback } from 'react'
import Map, { Marker, Popup, Source, Layer, NavigationControl } from 'react-map-gl'
import { fetchNeighborhoodData } from '../utils/arcgis'
import 'mapbox-gl/dist/mapbox-gl.css'
import '../css/Map.css'

function MapComponent({ data, loading, selectedFeature, onMarkerSelect, selectedCity, selectedNeighborhood }) {
  const [viewState, setViewState] = useState({
    longitude: -74.0060,
    latitude: 40.7128,
    zoom: 12
  })
  const [selectedMarker, setSelectedMarker] = useState(null)
  const [overlappingFeatures, setOverlappingFeatures] = useState([])
  const [selectedOverlapIndex, setSelectedOverlapIndex] = useState(0)
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

  // Helper function to determine space type
  const getSpaceType = (properties) => {
    const type = properties?.type || properties?.Type || ''
    const typeLower = type.toLowerCase().trim()
    
    if (typeLower.includes('production') && typeLower.includes('presentation')) {
      return 'both'
    } else if (typeLower.includes('production')) {
      return 'production'
    } else if (typeLower.includes('presentation')) {
      return 'presentation'
    }
    return 'unknown'
  }

  // Helper function to get marker color based on space type
  // Colors are designed to meet WCAG AA contrast ratio (3:1) against white background
  // Reference: https://webaim.org/resources/contrastchecker/
  const getMarkerColor = (properties, isSelected) => {
    if (isSelected) {
      return '#87CEEB' // Light blue for selected/highlighted markers
    }
    
    const spaceType = getSpaceType(properties)
    switch (spaceType) {
      case 'presentation':
        return '#0066CC' // Dark blue - meets WCAG AA (contrast ratio ~4.5:1)
      case 'production':
        return '#008844' // Dark green - meets WCAG AA (contrast ratio ~4.2:1)
      case 'both':
        return '#663399' // Dark purple - meets WCAG AA (contrast ratio ~4.8:1)
      case 'unknown':
        return '#CC6600' // Dark orange - meets WCAG AA (contrast ratio ~4.1:1)
      default:
        return '#CC6600' // Dark orange for unknown
    }
  }

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

  // Helper function to get marker coordinates from any geometry type
  const getMarkerCoordinates = (geometry) => {
    if (!geometry) return null
    
    if (geometry.type === 'Point') {
      if (geometry.coordinates && Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2) {
        return geometry.coordinates
      }
    } else if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
      // Extract all coordinates and calculate centroid
      const coords = extractCoordinates(geometry)
      if (coords.length > 0) {
        // Calculate centroid (average of all coordinates)
        const lons = coords.map(c => c[0]).filter(val => val != null)
        const lats = coords.map(c => c[1]).filter(val => val != null)
        if (lons.length > 0 && lats.length > 0) {
          const avgLon = lons.reduce((sum, val) => sum + val, 0) / lons.length
          const avgLat = lats.reduce((sum, val) => sum + val, 0) / lats.length
          return [avgLon, avgLat]
        }
        // Fallback: use first coordinate
        if (coords[0] && coords[0].length >= 2) {
          return coords[0]
        }
      }
    }
    
    return null
  }

  // Debug: Log features with invalid coordinates
  useEffect(() => {
    if (data.length > 0) {
      const invalidFeatures = data.filter(feature => {
        const coords = getMarkerCoordinates(feature.geometry)
        return !coords || coords.length < 2
      })
      
      if (invalidFeatures.length > 0) {
        console.group('⚠️ Features with invalid coordinates:')
        invalidFeatures.forEach(feature => {
          const name = feature.properties?.name || feature.properties?.Name || 'Unknown'
          const city = feature.properties?.city || feature.properties?.City || 'Unknown'
          const neighborhood = feature.properties?.neighborhood || feature.properties?.Neighborhood || 'Unknown'
          const geometryType = feature.geometry?.type || 'No geometry'
          console.log(`- Name: "${name}" | City: ${city} | Neighborhood: ${neighborhood} | Geometry Type: ${geometryType}`)
          console.log('  Geometry:', feature.geometry)
        })
        console.groupEnd()
      }
    }
  }, [data])

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
    // Exclude Watertown from boundaries
    const matchingFeatures = massachusettsGeoJSON.features.filter(feature => {
      const townName = feature.properties?.town
      if (!townName) return false
      const townUpper = townName.toUpperCase().trim()
      // Exclude Watertown
      if (townUpper === 'WATERTOWN') return false
      return citiesFromData.has(townUpper)
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

  // Zoom to selected city polygon when city is selected (only if no neighborhood is selected)
  useEffect(() => {
    if (!selectedCity || !highlightedCities?.features || selectedNeighborhood) return

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
  }, [selectedCity, highlightedCities, selectedNeighborhood])

  // Zoom to selected neighborhood polygon when neighborhood is selected
  useEffect(() => {
    if (!selectedNeighborhood || !selectedCity) return

    // Determine which neighborhood data to use based on selected city
    let neighborhoodData = null
    if (selectedCity.toUpperCase().trim() === 'BOSTON' && bostonNeighborhoods) {
      neighborhoodData = bostonNeighborhoods
    } else if (selectedCity.toUpperCase().trim() === 'CAMBRIDGE' && cambridgeNeighborhoods) {
      neighborhoodData = cambridgeNeighborhoods
    } else if (selectedCity.toUpperCase().trim() === 'SOMERVILLE' && somervilleNeighborhoods) {
      neighborhoodData = somervilleNeighborhoods
    }

    if (!neighborhoodData?.features) return

    // Find the neighborhood polygon - try multiple possible property names
    const neighborhoodPolygon = neighborhoodData.features.find(feature => {
      const props = feature.properties || {}
      // Try common property names for neighborhood
      const neighborhoodName = props.name || 
                              props.neighborhood || 
                              props.NAME || 
                              props.NEIGHBORHOOD ||
                              props.Neighborhood ||
                              props.Name ||
                              ''
      
      if (!neighborhoodName) return false
      return neighborhoodName.toUpperCase().trim() === selectedNeighborhood.toUpperCase().trim()
    })

    if (neighborhoodPolygon && neighborhoodPolygon.geometry) {
      const coords = extractCoordinates(neighborhoodPolygon.geometry)
      if (coords.length > 0) {
        const bounds = calculateBounds(coords)
        // Use a higher zoom level for neighborhoods (they're smaller than cities)
        if (bounds) {
          setViewState(prev => ({
            ...prev,
            ...bounds,
            zoom: Math.max(bounds.zoom, 14) // Ensure at least zoom level 14 for neighborhoods
          }))
        }
      }
    }
  }, [selectedNeighborhood, selectedCity, bostonNeighborhoods, cambridgeNeighborhoods, somervilleNeighborhoods])

  // Helper function to check if two coordinates are the same (with small tolerance)
  const areCoordinatesSame = (coords1, coords2, tolerance = 0.0001) => {
    if (!coords1 || !coords2 || coords1.length < 2 || coords2.length < 2) return false
    return Math.abs(coords1[0] - coords2[0]) < tolerance && Math.abs(coords1[1] - coords2[1]) < tolerance
  }

  const handleMarkerClick = useCallback((feature, event) => {
    event.originalEvent.stopPropagation()
    
    // Find all features at the same coordinates
    const clickedCoords = getMarkerCoordinates(feature.geometry)
    if (!clickedCoords) return
    
    const overlapping = data.filter(f => {
      const coords = getMarkerCoordinates(f.geometry)
      return coords && areCoordinatesSame(coords, clickedCoords)
    })
    
    if (overlapping.length > 1) {
      // Multiple features at same location - show scrollable list
      setOverlappingFeatures(overlapping)
      setSelectedOverlapIndex(0)
      setSelectedMarker(overlapping[0])
      if (onMarkerSelect) {
        onMarkerSelect(overlapping[0])
      }
    } else {
      // Single feature - normal behavior
      setOverlappingFeatures([])
      setSelectedOverlapIndex(0)
      setSelectedMarker(feature)
      if (onMarkerSelect) {
        onMarkerSelect(feature)
      }
    }
  }, [onMarkerSelect, data])

  // Sync selectedFeature prop with selectedMarker state
  useEffect(() => {
    if (selectedFeature) {
      setSelectedMarker(selectedFeature)
      
      // Check if there are overlapping features at this location
      const coords = getMarkerCoordinates(selectedFeature.geometry)
      if (coords) {
        const overlapping = data.filter(f => {
          const fCoords = getMarkerCoordinates(f.geometry)
          return fCoords && areCoordinatesSame(fCoords, coords)
        })
        
        if (overlapping.length > 1) {
          const index = overlapping.findIndex(f => f === selectedFeature)
          setOverlappingFeatures(overlapping)
          setSelectedOverlapIndex(index >= 0 ? index : 0)
        } else {
          setOverlappingFeatures([])
          setSelectedOverlapIndex(0)
        }
      }
      
      // Pan to selected feature - handle all geometry types
      if (coords && coords.length >= 2) {
        const [lng, lat] = coords
        setViewState(prev => ({
          ...prev,
          longitude: lng,
          latitude: lat,
          zoom: Math.max(prev.zoom, 14) // Zoom in if needed
        }))
      }
    } else {
      // Clear overlapping features when selection is cleared
      setOverlappingFeatures([])
      setSelectedOverlapIndex(0)
    }
  }, [selectedFeature, data])

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
                  '#4a90e2' // Default blue for Cambridge
                ],
                'fill-opacity': 0.15
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

        {/* Markers for each space - display all features with valid geometry */}
        {data.map((feature, index) => {
          const markerCoords = getMarkerCoordinates(feature.geometry)
          if (!markerCoords || markerCoords.length < 2) return null
          
          const [lng, lat] = markerCoords
          const props = feature.properties || {}
          const currentSelected = selectedFeature || selectedMarker
          
          // Check if this feature is selected (compare by feature reference or coordinates)
          const isSelected = currentSelected && (
            currentSelected === feature ||
            (currentSelected.geometry && 
             getMarkerCoordinates(currentSelected.geometry) &&
             getMarkerCoordinates(currentSelected.geometry)[0] === lng && 
             getMarkerCoordinates(currentSelected.geometry)[1] === lat)
          )

          const markerColor = getMarkerColor(props, isSelected)

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
                    fill={markerColor}
                  />
                </svg>
              </div>
            </Marker>
          )
        })}

        {/* Popup for selected marker */}
        {(selectedFeature || selectedMarker) && (() => {
          const feature = selectedFeature || selectedMarker
          const coords = getMarkerCoordinates(feature.geometry)
          if (!coords || coords.length < 2) return null
          
          // Use overlapping features if available, otherwise use single feature
          const featuresToShow = overlappingFeatures.length > 1 ? overlappingFeatures : [feature]
          const currentFeature = featuresToShow[selectedOverlapIndex] || feature
          const hasMultiple = overlappingFeatures.length > 1
          
          return (
            <Popup
              longitude={coords[0]}
              latitude={coords[1]}
              anchor="bottom"
              offset={[0, -10]}
              onClose={() => {
                setSelectedMarker(null)
                setOverlappingFeatures([])
                setSelectedOverlapIndex(0)
                if (onMarkerSelect) {
                  onMarkerSelect(null)
                }
              }}
              closeOnClick={false}
              closeButton={true}
              style={{ maxWidth: '400px', zIndex: 999 }}
            >
              <div className="popup-content">
                {currentFeature.properties?.name && (
                  <h3 className="popup-title">{currentFeature.properties.name}</h3>
                )}
                <table className="popup-table">
                  <tbody>
                    {(() => {
                      const props = currentFeature.properties || {}
                      const fieldsToShow = ['name', 'type', 'city', 'neighborhood', 'full_address', 'url']
                      
                      // Display labels mapping
                      const displayLabels = {
                        'name': 'Name',
                        'type': 'Type',
                        'city': 'City',
                        'neighborhood': 'Neighborhood',
                        'full_address': 'Address',
                        'url': 'Website Link'
                      }
                      
                      return fieldsToShow
                        .map(fieldName => {
                          // Find the property key (case-insensitive match)
                          const propKey = Object.keys(props).find(
                            key => key.toLowerCase() === fieldName.toLowerCase()
                          )
                          
                          if (!propKey) return null
                          
                          const value = props[propKey]
                          if (value === null || value === undefined || value === '') return null
                          
                          // Format the value
                          let displayValue = value
                          if (typeof value === 'object') {
                            displayValue = JSON.stringify(value)
                          } else {
                            displayValue = String(value)
                          }
                          
                          // Check if this is a URL field and make it clickable
                          const isUrlField = fieldName.toLowerCase() === 'url'
                          let valueContent = displayValue
                          
                          if (isUrlField) {
                            // Ensure URL has protocol
                            let url = displayValue.trim()
                            if (!url.match(/^https?:\/\//i)) {
                              url = 'https://' + url
                            }
                            valueContent = (
                              <a 
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="popup-link"
                              >
                                {displayValue}
                              </a>
                            )
                          }
                          
                          return (
                            <tr key={fieldName}>
                              <td className="popup-label">{displayLabels[fieldName]}:</td>
                              <td className="popup-value">{valueContent}</td>
                            </tr>
                          )
                        })
                        .filter(Boolean)
                    })()}
                  </tbody>
                </table>
                
                {/* Show navigation at bottom if multiple features */}
                {hasMultiple && (
                  <div className="popup-navigation">
                    <span className="popup-nav-counter">
                      {selectedOverlapIndex + 1} / {featuresToShow.length}
                    </span>
                    <button
                      className="popup-nav-button popup-nav-arrow"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Loop to next feature (wraps around to 0 when reaching the end)
                        const newIndex = (selectedOverlapIndex + 1) % featuresToShow.length
                        setSelectedOverlapIndex(newIndex)
                        setSelectedMarker(featuresToShow[newIndex])
                        if (onMarkerSelect) {
                          onMarkerSelect(featuresToShow[newIndex])
                        }
                      }}
                      title={`Next (${selectedOverlapIndex + 1} / ${featuresToShow.length})`}
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>
            </Popup>
          )
        })()}

        {/* Map Legend */}
        <div className="map-legend">
          <div className="legend-title">Space Types</div>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#0066CC' }}></div>
              <span className="legend-label">Presentation</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#008844' }}></div>
              <span className="legend-label">Production</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#663399' }}></div>
              <span className="legend-label">Production and Presentation</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#CC6600' }}></div>
              <span className="legend-label">Unknown</span>
            </div>
          </div>
        </div>
      </Map>
    </div>
  )
}

export default MapComponent