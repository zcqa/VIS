export type Locale = 'zh' | 'en'

export type MetricKey = 'co2PerCapita' | 'consumptionCo2PerCapita' | 'co2'

export interface CountryOption {
  country: string
  isoCode: string
  iso2Code: string
  region: string
  incomeLevel: string
  featured: boolean
}

export interface StoryPreset {
  id: string
  label: string
  description: string
  countries: string[]
  metric?: MetricKey
  startYear?: number
  endYear?: number
}

export interface DataMeta {
  baselineYear: number
  latestYear: number
  years: number[]
  regions: string[]
  incomeLevels: string[]
  featuredCountries: string[]
  countryOptions: CountryOption[]
  storyPresets: StoryPreset[]
}

export interface CountryYearRecord {
  country: string
  isoCode: string
  iso2Code: string
  region: string
  incomeLevel: string
  year: number
  population: number | null
  gdp: number | null
  gdpPerCapita: number | null
  co2: number | null
  co2PerCapita: number | null
  consumptionCo2: number | null
  consumptionCo2PerCapita: number | null
  primaryEnergyConsumption: number | null
  renewablesShareEnergy: number | null
  fossilShareEnergy: number | null
  coalShareEnergy: number | null
  oilShareEnergy: number | null
  gasShareEnergy: number | null
  nuclearShareEnergy: number | null
  lowCarbonShareEnergy: number | null
  renewablesShareElec: number | null
  fossilShareElec: number | null
}

export interface OverviewPoint extends CountryOption {
  startYear: number
  endYear: number
  startRecord: CountryYearRecord
  endRecord: CountryYearRecord
  gdpChangePct: number
  metricChangePct: number
  renewablesChangePts: number | null
  metricStart: number | null
  metricEnd: number | null
  status:
    | 'decoupled'
    | 'growth-with-emissions'
    | 'low-growth-lower-emissions'
    | 'low-growth-higher-emissions'
}
