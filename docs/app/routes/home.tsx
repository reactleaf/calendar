import { HomePage } from '@/components/home-page'
import type { Route } from './+types/home'

export function meta(_props: Route.MetaArgs) {
  return [
    { title: '@reactleaf/calendar' },
    {
      name: 'description',
      content: 'A modern rewrite of react-infinite-calendar — calendar for React with Temporal.',
    },
  ]
}

export default function Home() {
  return <HomePage />
}
