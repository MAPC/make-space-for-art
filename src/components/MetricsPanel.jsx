import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import './MetricsPanel.css'

const COLORS = ['#4a90e2', '#50c878', '#ff6b6b', '#ffa500', '#9b59b6', '#1abc9c', '#e74c3c', '#3498db']

function MetricsPanel({
  data,
  cities,
  neighborhoods,
  selectedCity,
  selectedNeighborhood,
  onCityChange,
  onNeighborhoodChange,
  loading
}) {
  const totalSpaces = data.length

  // Calculate review states distribution
  const reviewStateData = useMemo(() => {
    const counts = {}
    data.forEach(feature => {
      const reviewState = feature.properties?.review_state || 
                         feature.properties?.reviewState || 
                         feature.properties?.review_status ||
                         feature.properties?.reviewStatus ||
                         feature.properties?.status ||
                         feature.properties?.Status ||
                         'Unknown'
      const state = String(reviewState).trim() || 'Unknown'
      counts[state] = (counts[state] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [data])

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

        {/* Review States Metric */}
        {reviewStateData.length > 0 && (
          <div className="metric-card">
            <div className="metric-label">Review States</div>
            <div className="review-states-list">
              {reviewStateData.map((item, index) => (
                <div key={item.name} className="review-state-item">
                  <span className="review-state-name">{item.name}:</span>
                  <span className="review-state-value">{item.value}</span>
                </div>
              ))}
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
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
