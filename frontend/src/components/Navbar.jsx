import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/prediction', label: 'Prediction' },
  { to: '/recharge', label: 'Recharge Assessment' },
  { to: '/spatial', label: 'Spatial Analysis' },
  { to: '/explainability', label: 'Technical Insights' },
  { to: '/about', label: 'About' },
]

function Navbar() {
  return (
    <header className="site-header">
      <div className="brand-block">
        <span className="brand-mark">GW</span>
        <div className="brand-copy">
          <p className="brand-title">Groundwater AI</p>
          <p className="brand-subtitle">Academic project dashboard</p>
        </div>
      </div>

      <nav className="main-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}

export default Navbar
