import {
  CalendarBlank,
  CheckCircle,
  DotsThree,
  FolderSimple,
  GearSix,
  House,
  Lightning,
  List,
  Mountains,
  SquaresFour,
  NotePencil,
  Target,
  TennisBall,
  Wallet,
  type IconWeight,
} from '@phosphor-icons/react'

// Iconen (Phosphor) voor zijbalk, tegels en onderwerp-pagina's.

const MAP = {
  home: House,
  agenda: CalendarBlank,
  todo: CheckCircle,
  doelen: Target,
  financien: Wallet,
  notities: NotePencil,
  weddenschappen: TennisBall,
  projecten: FolderSimple,
  settings: GearSix,
  menu: List,
  more: DotsThree,
  quick: Lightning,
  logo: Mountains,
  layout: SquaresFour,
} as const

export type IconName = keyof typeof MAP

export function Icon({ name, size = 22, weight = 'regular', className }: { name: IconName; size?: number; weight?: IconWeight; className?: string }) {
  const Component = MAP[name]
  return <Component size={size} weight={weight} className={className} aria-hidden="true" />
}
