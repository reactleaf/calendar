import type { Route } from './+types/home'
import { CalendarPlayground } from '@/components/calendar-playground'

export function meta(_props: Route.MetaArgs) {
  return [
    { title: 'Calendar mode playground' },
    {
      name: 'description',
      content: 'React smooth calendar — single, multiple, and range demos.',
    },
  ]
}

export default function Home() {
  return <CalendarPlayground />
}
