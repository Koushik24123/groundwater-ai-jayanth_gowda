function ReasonList({ title, items }) {
  if (!items || items.length === 0) return null

  return (
    <div className="reason-list">
      {title && <h3>{title}</h3>}
      <ul>
        {items.map((item, index) => (
          <li key={item.title ? item.title : index}>
            {item.title ? (
              <>
                <strong>{item.title}: </strong>
                {item.detail}
              </>
            ) : (
              item
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ReasonList