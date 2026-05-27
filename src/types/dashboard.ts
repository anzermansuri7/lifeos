export type Stat = {
  label: string
  value: string
  helper: string
  tone: 'emerald' | 'sky' | 'violet' | 'amber'
}

export type ChartPoint = {
  name: string
  habits: number
  sleep: number
  focus: number
}
