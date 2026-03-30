import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { csvParse } from 'd3-dsv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const rawDir = path.join(rootDir, 'data', 'raw')
const outputDir = path.join(rootDir, 'public', 'data')

const YEAR_START = 1990
// OWID CO2 data includes 2023 emissions, but GDP coverage for the decoupling comparison
// is broadly complete through 2022. We use the latest year with consistent GDP + CO2 coverage.
const YEAR_END = 2022

const STORY_PRESETS = [
  {
    id: 'china',
    label: '看中国',
    description: '观察高速增长与排放变化是否同步。',
    countries: ['CHN'],
    metric: 'co2PerCapita',
  },
  {
    id: 'uk-germany',
    label: '看英国与德国',
    description: '两个欧洲脱钩样本，但转型节奏并不相同。',
    countries: ['GBR', 'DEU'],
    metric: 'co2PerCapita',
  },
  {
    id: 'us-india',
    label: '看美国与印度',
    description: '对比成熟经济体与新兴经济体的路径差异。',
    countries: ['USA', 'IND'],
    metric: 'co2PerCapita',
  },
  {
    id: 'high-income',
    label: '看高收入样本',
    description: '一组高收入国家如何在能源结构上分化。',
    countries: ['DEU', 'GBR', 'SWE', 'DNK'],
    metric: 'consumptionCo2PerCapita',
  },
  {
    id: 'growth-and-emissions',
    label: '看增长伴随排放',
    description: '快速增长国家是否仍处于排放上行阶段。',
    countries: ['CHN', 'IND', 'IDN', 'SAU'],
    metric: 'co2PerCapita',
  },
]

const FEATURED_COUNTRIES = ['CHN', 'USA', 'IND', 'DEU', 'GBR']

const co2Fields = [
  'population',
  'gdp',
  'co2',
  'co2_per_capita',
  'consumption_co2',
  'consumption_co2_per_capita',
]

const energyFields = [
  'primary_energy_consumption',
  'renewables_share_energy',
  'fossil_share_energy',
  'coal_share_energy',
  'oil_share_energy',
  'gas_share_energy',
  'nuclear_share_energy',
  'low_carbon_share_energy',
  'renewables_share_elec',
  'fossil_share_elec',
]

function parseNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function round(value, digits = 3) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null
  }

  return Number(value.toFixed(digits))
}

function percentChange(start, end) {
  if (start === null || end === null || start === 0) {
    return null
  }

  return ((end - start) / start) * 100
}

function computePerCapita(gdp, population) {
  if (gdp === null || population === null || population === 0) {
    return null
  }

  return gdp / population
}

function simplifyRegion(label) {
  const normalizedLabel = label.trim()
  const regionMap = new Map([
    ['East Asia & Pacific', 'East Asia & Pacific'],
    ['Europe & Central Asia', 'Europe & Central Asia'],
    ['Latin America & Caribbean', 'Latin America & Caribbean'],
    ['Middle East, North Africa, Afghanistan & Pakistan', 'Middle East & North Africa'],
    ['North America', 'North America'],
    ['South Asia', 'South Asia'],
    ['Sub-Saharan Africa', 'Sub-Saharan Africa'],
  ])

  return regionMap.get(normalizedLabel) ?? normalizedLabel
}

function readCsv(filePath) {
  return readFile(filePath, 'utf8').then((content) => csvParse(content))
}

function getOrCreateRecord(map, key, defaults) {
  if (!map.has(key)) {
    map.set(key, { ...defaults })
  }

  return map.get(key)
}

const worldBankRaw = JSON.parse(
  await readFile(path.join(rawDir, 'world-bank-country-metadata.json'), 'utf8'),
)

const worldBankEntries = Array.isArray(worldBankRaw) ? worldBankRaw[1] : []
const countryMetaByIso3 = new Map(
  worldBankEntries
    .filter(
      (entry) =>
        entry?.id &&
        entry.region?.value &&
        entry.region.value !== 'Aggregates' &&
        entry.incomeLevel?.value &&
        entry.incomeLevel.value !== 'Aggregates',
    )
    .map((entry) => [
      entry.id,
      {
        isoCode: entry.id,
        iso2Code: entry.iso2Code ?? '',
        region: simplifyRegion(entry.region.value),
        incomeLevel: entry.incomeLevel.value.trim(),
      },
    ]),
)

const co2Rows = await readCsv(path.join(rawDir, 'owid-co2-data.csv'))
const energyRows = await readCsv(path.join(rawDir, 'owid-energy-data.csv'))

const mergedByCountryYear = new Map()

for (const row of co2Rows) {
  const isoCode = row.iso_code
  const year = Number(row.year)

  if (!countryMetaByIso3.has(isoCode) || year < YEAR_START || year > YEAR_END) {
    continue
  }

  const countryMeta = countryMetaByIso3.get(isoCode)
  const key = `${isoCode}-${year}`
  const record = getOrCreateRecord(mergedByCountryYear, key, {
    country: row.country,
    isoCode,
    iso2Code: countryMeta.iso2Code,
    region: countryMeta.region,
    incomeLevel: countryMeta.incomeLevel,
    year,
  })

  for (const field of co2Fields) {
    const camelCaseField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    record[camelCaseField] = parseNumber(row[field])
  }
}

for (const row of energyRows) {
  const isoCode = row.iso_code
  const year = Number(row.year)

  if (!countryMetaByIso3.has(isoCode) || year < YEAR_START || year > YEAR_END) {
    continue
  }

  const countryMeta = countryMetaByIso3.get(isoCode)
  const key = `${isoCode}-${year}`
  const record = getOrCreateRecord(mergedByCountryYear, key, {
    country: row.country,
    isoCode,
    iso2Code: countryMeta.iso2Code,
    region: countryMeta.region,
    incomeLevel: countryMeta.incomeLevel,
    year,
  })

  for (const field of energyFields) {
    const camelCaseField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    record[camelCaseField] = parseNumber(row[field])
  }
}

const mergedRows = Array.from(mergedByCountryYear.values())
  .map((record) => {
    const gdpPerCapita = computePerCapita(record.gdp ?? null, record.population ?? null)

    return {
      ...record,
      gdpPerCapita: round(gdpPerCapita, 2),
      population: round(record.population ?? null, 0),
      gdp: round(record.gdp ?? null, 2),
      co2: round(record.co2 ?? null, 3),
      co2PerCapita: round(record.co2PerCapita ?? null, 3),
      consumptionCo2: round(record.consumptionCo2 ?? null, 3),
      consumptionCo2PerCapita: round(record.consumptionCo2PerCapita ?? null, 3),
      primaryEnergyConsumption: round(record.primaryEnergyConsumption ?? null, 3),
      renewablesShareEnergy: round(record.renewablesShareEnergy ?? null, 3),
      fossilShareEnergy: round(record.fossilShareEnergy ?? null, 3),
      coalShareEnergy: round(record.coalShareEnergy ?? null, 3),
      oilShareEnergy: round(record.oilShareEnergy ?? null, 3),
      gasShareEnergy: round(record.gasShareEnergy ?? null, 3),
      nuclearShareEnergy: round(record.nuclearShareEnergy ?? null, 3),
      lowCarbonShareEnergy: round(record.lowCarbonShareEnergy ?? null, 3),
      renewablesShareElec: round(record.renewablesShareElec ?? null, 3),
      fossilShareElec: round(record.fossilShareElec ?? null, 3),
    }
  })
  .sort((left, right) => {
    if (left.country === right.country) {
      return left.year - right.year
    }

    return left.country.localeCompare(right.country)
  })

const rowsByCountry = new Map()
for (const row of mergedRows) {
  if (!rowsByCountry.has(row.isoCode)) {
    rowsByCountry.set(row.isoCode, [])
  }

  rowsByCountry.get(row.isoCode).push(row)
}

const validCountryCodes = []
const defaultSummary = []

for (const [isoCode, rows] of rowsByCountry.entries()) {
  const startRow = rows.find((row) => row.year === YEAR_START)
  const endRow = rows.find((row) => row.year === YEAR_END)

  if (
    !startRow ||
    !endRow ||
    startRow.gdpPerCapita === null ||
    endRow.gdpPerCapita === null ||
    startRow.co2PerCapita === null ||
    endRow.co2PerCapita === null
  ) {
    continue
  }

  validCountryCodes.push(isoCode)

  const gdpChangePct = percentChange(startRow.gdpPerCapita, endRow.gdpPerCapita)
  const co2PerCapitaChangePct = percentChange(startRow.co2PerCapita, endRow.co2PerCapita)
  const consumptionChangePct = percentChange(
    startRow.consumptionCo2PerCapita,
    endRow.consumptionCo2PerCapita,
  )
  const renewablesChangePts =
    startRow.renewablesShareEnergy !== null && endRow.renewablesShareEnergy !== null
      ? endRow.renewablesShareEnergy - startRow.renewablesShareEnergy
      : null

  let status = 'growth-with-emissions'
  if (gdpChangePct !== null && co2PerCapitaChangePct !== null) {
    if (gdpChangePct >= 0 && co2PerCapitaChangePct < 0) {
      status = 'decoupled'
    } else if (gdpChangePct < 0 && co2PerCapitaChangePct < 0) {
      status = 'low-growth-lower-emissions'
    } else if (gdpChangePct < 0 && co2PerCapitaChangePct >= 0) {
      status = 'low-growth-higher-emissions'
    }
  }

  defaultSummary.push({
    country: endRow.country,
    isoCode,
    iso2Code: endRow.iso2Code,
    region: endRow.region,
    incomeLevel: endRow.incomeLevel,
    startYear: YEAR_START,
    endYear: YEAR_END,
    featured: FEATURED_COUNTRIES.includes(isoCode),
    gdpPerCapitaStart: startRow.gdpPerCapita,
    gdpPerCapitaEnd: endRow.gdpPerCapita,
    gdpChangePct: round(gdpChangePct, 2),
    co2PerCapitaStart: startRow.co2PerCapita,
    co2PerCapitaEnd: endRow.co2PerCapita,
    co2PerCapitaChangePct: round(co2PerCapitaChangePct, 2),
    consumptionCo2PerCapitaChangePct: round(consumptionChangePct, 2),
    renewablesChangePts: round(renewablesChangePts, 2),
    status,
  })
}

const validRows = mergedRows.filter((row) => validCountryCodes.includes(row.isoCode))

const countryOptions = Array.from(
  new Map(
    validRows.map((row) => [
      row.isoCode,
      {
        country: row.country,
        isoCode: row.isoCode,
        iso2Code: row.iso2Code,
        region: row.region,
        incomeLevel: row.incomeLevel,
        featured: FEATURED_COUNTRIES.includes(row.isoCode),
      },
    ]),
  ).values(),
).sort((left, right) => left.country.localeCompare(right.country))

const dataMeta = {
  baselineYear: YEAR_START,
  latestYear: YEAR_END,
  years: Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, index) => YEAR_START + index),
  regions: Array.from(new Set(countryOptions.map((entry) => entry.region))).sort(),
  incomeLevels: Array.from(new Set(countryOptions.map((entry) => entry.incomeLevel))).sort(),
  featuredCountries: FEATURED_COUNTRIES,
  countryOptions,
  storyPresets: STORY_PRESETS,
}

await mkdir(outputDir, { recursive: true })
await writeFile(
  path.join(outputDir, 'decoupling-country-year.json'),
  JSON.stringify(validRows, null, 2),
)
await writeFile(
  path.join(outputDir, 'decoupling-summary.json'),
  JSON.stringify(defaultSummary, null, 2),
)
await writeFile(path.join(outputDir, 'decoupling-meta.json'), JSON.stringify(dataMeta, null, 2))

console.log(
  `Prepared ${validRows.length} country-year rows across ${countryOptions.length} countries.`,
)
