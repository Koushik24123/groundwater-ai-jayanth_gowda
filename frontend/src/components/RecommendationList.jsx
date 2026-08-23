function RecommendationList({ items }) {
  if (!items || items.length === 0) return null

  return (
    <div className="recommendation-grid">
      {items.map((item, index) => (
        <div key={item.title || index} className="recommendation-card">
          <h4>{item.title}</h4>
          <p>{item.detail}</p>
        </div>
      ))}
    </div>
  )
}

export default RecommendationList