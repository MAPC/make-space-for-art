import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import './MetricsPanel.css'

// Color mapping to match map marker colors
// Colors are designed to meet WCAG AA contrast ratio (3:1) against white background
// Reference: https://webaim.org/resources/contrastchecker/
const getTypeColor = (typeName) => {
  const name = typeName.toLowerCase()
  if (name.includes('presentation') && name.includes('production')) {
    return '#663399' // Dark purple for both - meets WCAG AA
  } else if (name.includes('presentation')) {
    return '#0066CC' // Dark blue for presentation - meets WCAG AA
  } else if (name.includes('production')) {
    return '#008844' // Dark green for production - meets WCAG AA
  } else if (name.includes('unknown')) {
    return '#CC6600' // Dark orange for unknown - meets WCAG AA
  }
  return '#CC6600' // Default dark orange for unknown
}

function MetricsPanel({
  data,
  cities,
  neighborhoods,
  selectedCity,
  selectedNeighborhood,
  selectedType,
  onCityChange,
  onNeighborhoodChange,
  onTypeChange,
  loading
}) {
  const totalSpaces = data.length

  // Calculate share of spaces by type (production, presentation, or both)
  const typeData = useMemo(() => {
    let productionCount = 0
    let presentationCount = 0
    let bothCount = 0

    data.forEach(feature => {
      const type = feature.properties?.type || feature.properties?.Type || ''
      const typeLower = type.toLowerCase().trim()
      
      if (typeLower.includes('production') && typeLower.includes('presentation')) {
        bothCount++
      } else if (typeLower.includes('production')) {
        productionCount++
      } else if (typeLower.includes('presentation')) {
        presentationCount++
      }
    })

    const result = []
    if (productionCount > 0) {
      result.push({ name: 'Production', value: productionCount })
    }
    if (presentationCount > 0) {
      result.push({ name: 'Presentation', value: presentationCount })
    }
    if (bothCount > 0) {
      result.push({ name: 'Production and Presentation', value: bothCount })
    }

    return result.sort((a, b) => b.value - a.value)
  }, [data])

  return (
    <div className="metrics-panel">
      <div className="panel-header">
        <h2>Creative Spaces</h2>
      </div>
      
      <div className="panel-content">
        <div className="metric-card">
          <div className="metric-label">Total Spaces</div>
          <div className="metric-value">{loading ? '...' : totalSpaces}</div>
        </div>

        <div className="filter-section">
          <label className="filter-label">City</label>
          <select
            className="filter-select"
            value={selectedCity}
            onChange={(e) => onCityChange(e.target.value)}
          >
            <option value="">All Cities</option>
            {cities.map(city => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-section">
          <label className="filter-label">Neighborhood</label>
          <select
            className="filter-select"
            value={selectedNeighborhood}
            onChange={(e) => onNeighborhoodChange(e.target.value)}
          >
            <option value="">All Neighborhoods</option>
            {neighborhoods.map(neighborhood => (
              <option key={neighborhood} value={neighborhood}>
                {neighborhood}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-section">
          <label className="filter-label">Type</label>
          <select
            className="filter-select"
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="presentation">Presentation</option>
            <option value="production">Production</option>
            <option value="both">Production and Presentation</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        {selectedCity && (
          <div className="metric-card">
            <div className="metric-label">Spaces in {selectedCity}</div>
            <div className="metric-value">
              {data.filter(f => f.properties?.city === selectedCity).length}
            </div>
          </div>
        )}

        {selectedNeighborhood && (
          <div className="metric-card">
            <div className="metric-label">Spaces in {selectedNeighborhood}</div>
            <div className="metric-value">
              {data.filter(f => f.properties?.neighborhood === selectedNeighborhood).length}
            </div>
          </div>
        )}

        {/* Share of Spaces by Type Pie Chart */}
        {typeData.length > 0 && (
          <div className="chart-card">
            <div className="chart-title">Share of Spaces by Type</div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => {
                    const total = typeData.reduce((sum, item) => sum + item.value, 0)
                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
                    return (
                      <text
                        x={0}
                        y={0}
                        fill="#333"
                        textAnchor="middle"
                        fontSize="8px"
                        fontWeight="500"
                      >
                        {`${name}: ${percentage}%`}
                      </text>
                    )
                  }}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                  activeShape={null}
                  isAnimationActive={false}
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getTypeColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => {
                    const total = typeData.reduce((sum, item) => sum + item.value, 0)
                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
                    return [`${value} spaces (${percentage}%)`, props.payload?.name || name]
                  }}
                  contentStyle={{ fontSize: '10px', padding: '6px' }}
                  labelStyle={{ fontSize: '9px', marginBottom: '4px' }}
                  itemStyle={{ fontSize: '9px', padding: '2px 0' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              {typeData.map((item, index) => {
                const total = typeData.reduce((sum, i) => sum + i.value, 0)
                const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'
                return (
                  <div key={item.name} className="legend-item">
                    <span 
                      className="legend-color" 
                      style={{ backgroundColor: getTypeColor(item.name) }}
                    ></span>
                    <span className="legend-label">
                      {item.name}: {item.value} ({percentage}%)
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MetricsPanel
