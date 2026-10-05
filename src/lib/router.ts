import { useEffect, useState } from 'react'

/** Pagina's van de app. Hash-routes werken op GitHub Pages en in de geïnstalleerde app zonder server-instellingen. */
export type Route = '/' | '/todo' | '/doelen' | '/financien' | '/notities' | '/projecten'

const ROUTES: Route[] = ['/', '/todo', '/doelen', '/financien', '/notities', '/projecten']

export function parseRoute(hash: string): Route {
  const path = hash.startsWith('#') ? hash.slice(1) : hash
  return (ROUTES as string[]).includes(path) ? (path as Route) : '/'
}

export function navigate(route: Route) {
  window.location.hash = route
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
