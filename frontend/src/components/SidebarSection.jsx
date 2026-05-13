import { useLocation } from 'react-router-dom'
import { isSameAppRoute, toAppRoute } from '../utils/navigation'

export default function SidebarSection({ title, links, onNavigate }) {
  const location = useLocation()

  return (
    <>
      <h4>{title}</h4>
      <ul>
        {links.map((link) => {
          const targetRoute = toAppRoute(link.href)
          const isActive = targetRoute && isSameAppRoute(location, targetRoute)

          return (
            <li key={link.label} className={isActive ? 'active' : undefined}>
              <a
                href={link.href}
                className={isActive ? 'active' : undefined}
                onClick={(event) => onNavigate(event, link.href)}
              >
                <span>{link.label}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </>
  )
}
