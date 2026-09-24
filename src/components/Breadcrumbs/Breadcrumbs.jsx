import { Link } from 'react-router'

// items: [{ label, to? }]. `to` is an app route. The last item is the current page.
function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="crumbs">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${index}-${item.label}`} className="crumb-item">
              {isLast ? (
                <span aria-current="page" className="crumb-current">
                  {item.label}
                </span>
              ) : item.to ? (
                <Link to={item.to} className="crumb-link">
                  {item.label}
                </Link>
              ) : (
                <span className="crumb-link">{item.label}</span>
              )}
              {!isLast && (
                <span className="crumb-sep" aria-hidden="true">
                  ›
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
