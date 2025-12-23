import { useState, useEffect, useMemo } from 'react'
import Map from './components/Map'
import MetricsPanel from './components/MetricsPanel'
import { fetchFeatureServiceData } from './utils/arcgis'
import './App.css'

function App() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('')
  const [selectedType, setSelectedType] = useState('')
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

  // Filter data based on selections
  const filteredData = useMemo(() => {
    return data.filter(feature => {
      const props = feature.properties || {}
      const city = props.city || ''
      const neighborhood = props.neighborhood || ''
      
      if (selectedCity && city !== selectedCity) return false
      if (selectedNeighborhood && neighborhood !== selectedNeighborhood) return false
      
      // Filter by type if selected
      if (selectedType) {
        const spaceType = getSpaceType(props)
        if (selectedType === 'both' && spaceType !== 'both') return false
        if (selectedType === 'production' && spaceType !== 'production') return false
        if (selectedType === 'presentation' && spaceType !== 'presentation') return false
        if (selectedType === 'unknown' && spaceType !== 'unknown') return false
      }
      
      return true
    })
  }, [data, selectedCity, selectedNeighborhood, selectedType])

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

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <span className="title-word">MAKING</span>{' '}
          <span className="title-word space-word">SPACE</span>{' '}
          <span className="title-word for-art-words">FOR ART</span>
        </h1>
        <p className="app-subtitle">Securing Cultural Infrastructure in Boston, Cambridge & Somerville</p>
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
            selectedType={selectedType}
            onCityChange={setSelectedCity}
            onNeighborhoodChange={setSelectedNeighborhood}
            onTypeChange={setSelectedType}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}

export default App
