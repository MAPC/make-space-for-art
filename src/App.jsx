import { useState, useEffect, useMemo } from 'react'
import Map from './components/Map'
import MetricsPanel from './components/MetricsPanel'
import { fetchFeatureServiceData } from './utils/arcgis'
import './App.css'
import './components/DataTable.css'

function App() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('')
  const [isTableExpanded, setIsTableExpanded] = useState(false)
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [selectedTableRow, setSelectedTableRow] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const features = await fetchFeatureServiceData()
        setData(features)
        setLoading(false)
      } catch (error) {
        console.error('Error loading data:', error)
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Filter data based on selections
  const filteredData = useMemo(() => {
    let filtered = data.filter(feature => {
      const props = feature.properties || {}
      const city = props.city || ''
      const neighborhood = props.neighborhood || ''
      
      if (selectedCity && city !== selectedCity) return false
      if (selectedNeighborhood && neighborhood !== selectedNeighborhood) return false
      return true
    })

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a.properties?.[sortConfig.key]
        const bValue = b.properties?.[sortConfig.key]
        
        // Handle null/undefined/empty values - always put them at the end
        const aIsEmpty = aValue === null || aValue === undefined || aValue === ''
        const bIsEmpty = bValue === null || bValue === undefined || bValue === ''
        
        if (aIsEmpty && bIsEmpty) return 0
        if (aIsEmpty) return 1
        if (bIsEmpty) return -1
        
        // Handle different types
        let comparison = 0
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue
        } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
          comparison = aValue === bValue ? 0 : aValue ? 1 : -1
        } else {
          // Convert to string for comparison
          comparison = String(aValue).localeCompare(String(bValue), undefined, { 
            numeric: true, 
            sensitivity: 'base' 
          })
        }
        
        return sortConfig.direction === 'asc' ? comparison : -comparison
      })
    }

    return filtered
  }, [data, selectedCity, selectedNeighborhood, sortConfig])

  // Handle column sorting
  const handleSort = (key) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === key) {
        // Toggle direction if same column
        return {
          key,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }
      } else {
        // New column, default to ascending
        return { key, direction: 'asc' }
      }
    })
  }

  // Handle row click to highlight marker on map
  const handleRowClick = (feature) => {
    setSelectedTableRow(feature)
    // Scroll to map if needed
    const mapContainer = document.querySelector('.map-container')
    if (mapContainer) {
      mapContainer.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }


  // Get unique cities
  const cities = useMemo(() => 
    [...new Set(data.map(f => f.properties?.city).filter(Boolean))].sort(),
    [data]
  )

  // Get neighborhoods filtered by selected city
  const neighborhoods = useMemo(() => {
    let filteredData = data
    if (selectedCity) {
      filteredData = data.filter(f => {
        const city = f.properties?.city || ''
        return city.toUpperCase().trim() === selectedCity.toUpperCase().trim()
      })
    }
    return [...new Set(
      filteredData
        .map(f => f.properties?.neighborhood)
        .filter(Boolean)
    )].sort()
  }, [data, selectedCity])

  // Clear selected neighborhood if it's not available in the selected city
  useEffect(() => {
    if (selectedCity && selectedNeighborhood) {
      const availableNeighborhoods = neighborhoods
      const neighborhoodExists = availableNeighborhoods.some(
        n => n.toUpperCase().trim() === selectedNeighborhood.toUpperCase().trim()
      )
      if (!neighborhoodExists) {
        setSelectedNeighborhood('')
      }
    }
  }, [selectedCity, neighborhoods, selectedNeighborhood])

  // Get all unique property keys from all features
  const allPropertyKeys = useMemo(() => {
    const keysSet = new Set()
    data.forEach(feature => {
      if (feature.properties) {
        Object.keys(feature.properties).forEach(key => {
          keysSet.add(key)
        })
      }
    })
    return Array.from(keysSet).sort()
  }, [data])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Neighborhood Creative Spaces</h1>
      </header>
      <div className="app-content">
        <div className="map-container">
          <Map 
            data={filteredData} 
            loading={loading}
            selectedFeature={selectedTableRow}
            onMarkerSelect={setSelectedTableRow}
            selectedCity={selectedCity}
            selectedNeighborhood={selectedNeighborhood}
          />
        </div>
        <div className="panel-container">
          <MetricsPanel
            data={filteredData}
            cities={cities}
            neighborhoods={neighborhoods}
            selectedCity={selectedCity}
            selectedNeighborhood={selectedNeighborhood}
            onCityChange={setSelectedCity}
            onNeighborhoodChange={setSelectedNeighborhood}
            loading={loading}
          />
        </div>
      </div>
      
      {/* Full-width Data Table at bottom */}
      <div className="data-table-section">
        <button 
          className="table-toggle"
          onClick={() => setIsTableExpanded(!isTableExpanded)}
        >
          <span>Data Table</span>
          <span className="toggle-icon">
            {isTableExpanded ? (
              <i className="fas fa-chevron-down"></i>
            ) : (
              <i className="fas fa-chevron-right"></i>
            )}
          </span>
        </button>
        
        {isTableExpanded && (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {allPropertyKeys.map(key => {
                    const isNoteColumn = key.toLowerCase().includes('note')
                    const isNumericColumn = ['id', 'count', 'number', 'num', 'index'].some(term => 
                      key.toLowerCase().includes(term)
                    )
                    return (
                      <th 
                        key={key}
                        onClick={() => handleSort(key)}
                        className={`sortable-header ${isNoteColumn ? 'note-column' : ''} ${isNumericColumn ? 'numeric-column' : ''}`}
                      >
                        <span className="header-content">
                          {key}
                          <span className={`sort-icon ${sortConfig.key === key ? 'active' : ''}`}>
                            {sortConfig.key === key ? (
                              sortConfig.direction === 'asc' ? (
                                <i className="fas fa-sort-up"></i>
                              ) : (
                                <i className="fas fa-sort-down"></i>
                              )
                            ) : (
                              <i className="fas fa-sort"></i>
                            )}
                          </span>
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={allPropertyKeys.length} className="no-data">No data available</td>
                  </tr>
                ) : (
                  filteredData.map((feature, index) => {
                    const props = feature.properties || {}
                    const isSelected = selectedTableRow && 
                      selectedTableRow.geometry?.coordinates[0] === feature.geometry?.coordinates?.[0] &&
                      selectedTableRow.geometry?.coordinates[1] === feature.geometry?.coordinates?.[1]
                    
                    return (
                      <tr 
                        key={index}
                        onClick={() => handleRowClick(feature)}
                        className={isSelected ? 'selected-row' : ''}
                      >
                        {allPropertyKeys.map(key => {
                          const value = props[key]
                          const isNoteColumn = key.toLowerCase().includes('note')
                          const isNumericColumn = ['id', 'count', 'number', 'num', 'index'].some(term => 
                            key.toLowerCase().includes(term)
                          )
                          // Handle different value types
                          let displayValue = '-'
                          if (value !== null && value !== undefined && value !== '') {
                            if (typeof value === 'object') {
                              displayValue = JSON.stringify(value)
                            } else {
                              displayValue = String(value)
                            }
                          }
                          return (
                            <td 
                              key={key} 
                              title={displayValue}
                              className={`${isNoteColumn ? 'note-column' : ''} ${isNumericColumn ? 'numeric-column' : ''}`}
                            >
                              {displayValue}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
