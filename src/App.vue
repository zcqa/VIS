<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import EnergyMixPanel from './components/EnergyMixPanel.vue'
import InsightPanel from './components/InsightPanel.vue'
import OverviewScatter from './components/OverviewScatter.vue'
import TrajectoryPanel from './components/TrajectoryPanel.vue'
import type {
  CountryOption,
  CountryYearRecord,
  DataMeta,
  Locale,
  MetricKey,
  OverviewPoint,
  StoryPreset,
} from './types'
import { formatNumber, formatSignedPercent } from './utils/formatters'

const metricDefinitions: Record<MetricKey, Record<Locale, string>> = {
  co2PerCapita: { zh: '人均生产端 CO2', en: 'Production CO2 per capita' },
  consumptionCo2PerCapita: { zh: '人均消费端 CO2', en: 'Consumption CO2 per capita' },
  co2: { zh: 'CO2 总量', en: 'Total CO2' },
}

const regionLabels: Record<string, Record<Locale, string>> = {
  'East Asia & Pacific': { zh: '东亚与太平洋', en: 'East Asia & Pacific' },
  'Europe & Central Asia': { zh: '欧洲与中亚', en: 'Europe & Central Asia' },
  'Latin America & Caribbean': { zh: '拉丁美洲与加勒比', en: 'Latin America & Caribbean' },
  'Middle East & North Africa': { zh: '中东与北非', en: 'Middle East & North Africa' },
  'North America': { zh: '北美', en: 'North America' },
  'South Asia': { zh: '南亚', en: 'South Asia' },
  'Sub-Saharan Africa': { zh: '撒哈拉以南非洲', en: 'Sub-Saharan Africa' },
}

const incomeLabels: Record<string, Record<Locale, string>> = {
  'High income': { zh: '高收入', en: 'High income' },
  'Low income': { zh: '低收入', en: 'Low income' },
  'Lower middle income': { zh: '中低收入', en: 'Lower middle income' },
  'Upper middle income': { zh: '中高收入', en: 'Upper middle income' },
  'Not classified': { zh: '未分类', en: 'Not classified' },
}

const storyCopies: Record<string, Record<Locale, { label: string; description: string }>> = {
  china: {
    zh: { label: '只看中国', description: '观察高速增长与排放变化是否同步。' },
    en: { label: 'China only', description: 'Check whether rapid growth still moves in step with emissions.' },
  },
  'uk-germany': {
    zh: { label: '英国 vs 德国', description: '两个欧洲脱钩样本，但转型节奏并不相同。' },
    en: { label: 'UK vs Germany', description: 'Two European decoupling cases with different transition rhythms.' },
  },
  'us-india': {
    zh: { label: '美国 vs 印度', description: '对比成熟经济体与新兴经济体的路径差异。' },
    en: { label: 'US vs India', description: 'Compare the trajectories of a mature economy and an emerging economy.' },
  },
  'high-income': {
    zh: { label: '高收入样本', description: '观察高收入国家如何在能源结构上分化。' },
    en: { label: 'High-income cases', description: 'See how high-income countries diverge in their energy transitions.' },
  },
  'growth-and-emissions': {
    zh: { label: '增长伴随排放', description: '快速增长国家是否仍处于排放上行阶段。' },
    en: { label: 'Growth with emissions', description: 'See whether fast-growing countries still climb with emissions.' },
  },
}

const storyAnnotationMap: Record<
  Locale,
  Record<string, Array<{ isoCode: string; title: string; body: string; dx: number; dy: number }>>
> = {
  zh: {
    china: [{ isoCode: 'CHN', title: '中国', body: '增长很快，但排放仍处高位。', dx: 26, dy: -18 }],
    'uk-germany': [
      { isoCode: 'GBR', title: '英国', body: '更早退出煤炭，脱钩更明显。', dx: -188, dy: -66 },
      { isoCode: 'DEU', title: '德国', body: '也是脱钩样本，但路径更平缓。', dx: 24, dy: -26 },
    ],
    'us-india': [
      { isoCode: 'USA', title: '美国', body: '高收入样本，排放强度已回落。', dx: -186, dy: 30 },
      { isoCode: 'IND', title: '印度', body: '仍处于增长伴随排放阶段。', dx: 24, dy: 40 },
    ],
    'high-income': [
      { isoCode: 'DNK', title: '丹麦', body: '高收入国家中的低排放样本。', dx: -176, dy: -78 },
      { isoCode: 'SWE', title: '瑞典', body: '长期低碳结构非常稳定。', dx: 22, dy: -30 },
    ],
    'growth-and-emissions': [
      { isoCode: 'CHN', title: '中国', body: '规模很大，仍在右上象限。', dx: 26, dy: -20 },
      { isoCode: 'IND', title: '印度', body: '增长持续，排放也在抬升。', dx: 20, dy: 36 },
    ],
  },
  en: {
    china: [{ isoCode: 'CHN', title: 'China', body: 'Fast growth, but emissions remain high.', dx: 26, dy: -18 }],
    'uk-germany': [
      { isoCode: 'GBR', title: 'United Kingdom', body: 'Coal declined earlier, so decoupling is clearer.', dx: -226, dy: -66 },
      { isoCode: 'DEU', title: 'Germany', body: 'Also decoupled, but on a steadier path.', dx: 24, dy: -26 },
    ],
    'us-india': [
      { isoCode: 'USA', title: 'United States', body: 'A high-income case with falling emissions intensity.', dx: -228, dy: 32 },
      { isoCode: 'IND', title: 'India', body: 'Still in a growth-with-emissions phase.', dx: 24, dy: 40 },
    ],
    'high-income': [
      { isoCode: 'DNK', title: 'Denmark', body: 'A low-emissions case within high-income countries.', dx: -210, dy: -78 },
      { isoCode: 'SWE', title: 'Sweden', body: 'Its low-carbon structure stays stable over time.', dx: 22, dy: -30 },
    ],
    'growth-and-emissions': [
      { isoCode: 'CHN', title: 'China', body: 'A large right-upper-quadrant case.', dx: 26, dy: -20 },
      { isoCode: 'IND', title: 'India', body: 'Growth continues, and emissions rise with it.', dx: 20, dy: 36 },
    ],
  },
}

const locale = ref<Locale>('zh')
const loading = ref(true)
const errorMessage = ref('')
const records = ref<CountryYearRecord[]>([])
const meta = ref<DataMeta | null>(null)
const searchQuery = ref('')
const regionFilter = ref('All')
const incomeFilter = ref('All')
const selectedMetric = ref<MetricKey>('co2PerCapita')
const startYear = ref(1990)
const endYear = ref(2023)
const selectedCountries = ref<string[]>([])
const hoveredCountry = ref<string | null>(null)
const activeStory = ref<string | null>(null)

const copy = computed(() =>
  locale.value === 'zh'
    ? {
        title: '谁真正实现了“经济增长与碳排放脱钩”？',
        lead: '探索经济增长、排放变化与能源结构转型之间的关系。',
        statsMetric: '当前指标',
        statsRange: '当前时间范围',
        statsFocus: '当前主样本',
        storyFocus: '故事模式',
        storyHint: '当前比较组会自动切到最适合这个问题的一组国家和指标。',
        reset: '重置探索',
        search: '搜索国家',
        searchPlaceholder: '中国、Germany、USA...',
        region: '地区',
        income: '收入水平',
        metric: '指标',
        startYear: '起始年份',
        endYear: '结束年份',
        currentSelection: '当前筛选',
        timeBrush: '时间刷选',
        compareGroup: '比较组',
        compareEmpty: '点击散点即可加入比较',
        allRegions: '全部地区',
        allIncome: '全部收入水平',
        loadingTitle: '正在加载处理后的气候与能源数据…',
        loadingBody: '首次打开时会读取本地预处理结果，请稍等片刻。',
        dataErrorTitle: '数据读取失败',
        dataSources: '数据来源',
        materials: '交付材料',
        writeupNote: '项目说明已单独整理为仓库内文件',
        focusNote: '当前关注国家',
        none: '暂无',
      }
    : {
        title: 'Who Has Truly Decoupled Growth from Carbon Emissions?',
        lead: 'Explore how economic growth, emissions shifts, and energy transitions move together.',
        statsMetric: 'Current metric',
        statsRange: 'Selected range',
        statsFocus: 'Primary focus',
        storyFocus: 'Story focus',
        storyHint: 'The compare set automatically switches to the countries and metric that best explain this question.',
        reset: 'Reset exploration',
        search: 'Search country',
        searchPlaceholder: 'China, Germany, USA...',
        region: 'Region',
        income: 'Income level',
        metric: 'Metric',
        startYear: 'Start year',
        endYear: 'End year',
        currentSelection: 'Current selection',
        timeBrush: 'Time brush',
        compareGroup: 'Compare set',
        compareEmpty: 'Click points in the overview scatter to build a compare set',
        allRegions: 'All regions',
        allIncome: 'All income levels',
        loadingTitle: 'Loading processed climate and energy data...',
        loadingBody: 'The app is reading the local processed files for the first launch.',
        dataErrorTitle: 'Failed to load data',
        dataSources: 'Data Sources',
        materials: 'Submission Materials',
        writeupNote: 'The project write-up now lives in the repo file',
        focusNote: 'Current focus',
        none: 'None',
      },
)

function displayRegion(region: string) {
  return regionLabels[region]?.[locale.value] ?? region
}

function displayIncome(income: string) {
  return incomeLabels[income]?.[locale.value] ?? income
}

function metricValue(record: CountryYearRecord, metric: MetricKey) {
  if (metric === 'co2') {
    return record.co2
  }

  if (metric === 'consumptionCo2PerCapita') {
    return record.consumptionCo2PerCapita
  }

  return record.co2PerCapita
}

function percentChange(start: number | null, end: number | null) {
  if (start === null || end === null || start === 0) {
    return null
  }

  return ((end - start) / start) * 100
}

function overviewStatus(gdpChangePct: number, metricChangePct: number): OverviewPoint['status'] {
  if (gdpChangePct >= 0 && metricChangePct < 0) {
    return 'decoupled'
  }

  if (gdpChangePct < 0 && metricChangePct < 0) {
    return 'low-growth-lower-emissions'
  }

  if (gdpChangePct < 0 && metricChangePct >= 0) {
    return 'low-growth-higher-emissions'
  }

  return 'growth-with-emissions'
}

async function loadData() {
  loading.value = true
  errorMessage.value = ''

  try {
    const baseUrl = import.meta.env.BASE_URL
    const [recordResponse, metaResponse] = await Promise.all([
      fetch(`${baseUrl}data/decoupling-country-year.json`),
      fetch(`${baseUrl}data/decoupling-meta.json`),
    ])

    if (!recordResponse.ok || !metaResponse.ok) {
      throw new Error('Failed to load processed data files.')
    }

    const [recordJson, metaJson] = await Promise.all([recordResponse.json(), metaResponse.json()])
    records.value = recordJson
    meta.value = metaJson
    startYear.value = metaJson.baselineYear
    endYear.value = metaJson.latestYear
    selectedCountries.value = [metaJson.featuredCountries[0] ?? 'DEU'].filter(Boolean)
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : locale.value === 'zh'
          ? '未知数据读取错误。'
          : 'Unknown data loading error.'
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

watch(startYear, (newStart) => {
  if (newStart >= endYear.value && meta.value) {
    const nextYear = meta.value.years.find((year) => year > newStart)
    if (nextYear) {
      endYear.value = nextYear
    }
  }
  activeStory.value = null
})

watch(endYear, (newEnd) => {
  if (newEnd <= startYear.value && meta.value) {
    const previousYear = [...meta.value.years].reverse().find((year) => year < newEnd)
    if (previousYear) {
      startYear.value = previousYear
    }
  }
  activeStory.value = null
})

const years = computed(() => meta.value?.years ?? [])
const minYear = computed(() => years.value[0] ?? 1990)
const maxYear = computed(() => years.value.at(-1) ?? 2022)
const regionOptions = computed(() => [
  { value: 'All', label: copy.value.allRegions },
  ...((meta.value?.regions ?? []).map((region) => ({
    value: region,
    label: displayRegion(region),
  })) ?? []),
])
const incomeOptions = computed(() => [
  { value: 'All', label: copy.value.allIncome },
  ...((meta.value?.incomeLevels ?? []).map((income) => ({
    value: income,
    label: displayIncome(income),
  })) ?? []),
])

const rawStoryPresets = computed(() => meta.value?.storyPresets ?? [])
const localizedStoryPresets = computed<StoryPreset[]>(() =>
  rawStoryPresets.value.map((story) => ({
    ...story,
    label: storyCopies[story.id]?.[locale.value].label ?? story.label,
    description: storyCopies[story.id]?.[locale.value].description ?? story.description,
  })),
)
const activeStoryObject = computed(
  () => localizedStoryPresets.value.find((story) => story.id === activeStory.value) ?? null,
)

const metricOptions = computed(() =>
  (Object.keys(metricDefinitions) as MetricKey[]).map((value) => ({
    value,
    label: metricDefinitions[value][locale.value],
  })),
)
const currentMetricLabel = computed(() => metricDefinitions[selectedMetric.value][locale.value])

const recordsByCountry = computed(() => {
  const map = new Map<string, CountryYearRecord[]>()

  for (const record of records.value) {
    const existing = map.get(record.isoCode)
    if (existing) {
      existing.push(record)
    } else {
      map.set(record.isoCode, [record])
    }
  }

  for (const values of map.values()) {
    values.sort((left, right) => left.year - right.year)
  }

  return map
})

const recordLookup = computed(() => {
  const map = new Map<string, Map<number, CountryYearRecord>>()

  for (const record of records.value) {
    if (!map.has(record.isoCode)) {
      map.set(record.isoCode, new Map())
    }

    map.get(record.isoCode)?.set(record.year, record)
  }

  return map
})

function getRecord(isoCode: string, year: number) {
  return recordLookup.value.get(isoCode)?.get(year) ?? null
}

const filteredCountries = computed(() => {
  const normalizedSearch = searchQuery.value.trim().toLowerCase()

  return (meta.value?.countryOptions ?? []).filter((country) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      country.country.toLowerCase().includes(normalizedSearch) ||
      country.isoCode.toLowerCase().includes(normalizedSearch)

    const matchesRegion = regionFilter.value === 'All' || country.region === regionFilter.value
    const matchesIncome = incomeFilter.value === 'All' || country.incomeLevel === incomeFilter.value

    const hasStart = getRecord(country.isoCode, startYear.value)
    const hasEnd = getRecord(country.isoCode, endYear.value)

    return matchesSearch && matchesRegion && matchesIncome && hasStart && hasEnd
  })
})

const overviewPoints = computed<OverviewPoint[]>(() =>
  filteredCountries.value.flatMap((country) => {
    const startRecord = getRecord(country.isoCode, startYear.value)
    const endRecord = getRecord(country.isoCode, endYear.value)

    if (!startRecord || !endRecord) {
      return []
    }

    const gdpChangePct = percentChange(startRecord.gdpPerCapita, endRecord.gdpPerCapita)
    const metricStart = metricValue(startRecord, selectedMetric.value)
    const metricEnd = metricValue(endRecord, selectedMetric.value)
    const metricChangePct = percentChange(metricStart, metricEnd)

    if (gdpChangePct === null || metricChangePct === null) {
      return []
    }

    const renewablesChangePts =
      startRecord.renewablesShareEnergy !== null && endRecord.renewablesShareEnergy !== null
        ? endRecord.renewablesShareEnergy - startRecord.renewablesShareEnergy
        : null

    return [
      {
        ...country,
        startYear: startYear.value,
        endYear: endYear.value,
        startRecord,
        endRecord,
        gdpChangePct,
        metricChangePct,
        renewablesChangePts,
        metricStart,
        metricEnd,
        status: overviewStatus(gdpChangePct, metricChangePct),
      },
    ]
  }),
)

const selectedCountryObjects = computed<CountryOption[]>(() =>
  selectedCountries.value
    .map((isoCode) => meta.value?.countryOptions.find((country) => country.isoCode === isoCode) ?? null)
    .filter((country): country is CountryOption => country !== null),
)

const activeCountryIso = computed(() => {
  if (hoveredCountry.value) {
    return hoveredCountry.value
  }

  if (selectedCountries.value.length) {
    return selectedCountries.value[0]
  }

  return overviewPoints.value[0]?.isoCode ?? null
})

const activePoint = computed(
  () => overviewPoints.value.find((point) => point.isoCode === activeCountryIso.value) ?? null,
)

const activeSeries = computed(() => {
  if (!activeCountryIso.value) {
    return []
  }

  return (
    recordsByCountry.value
      .get(activeCountryIso.value)
      ?.filter((record) => record.year >= startYear.value && record.year <= endYear.value) ?? []
  )
})

const activeInsights = computed(() => {
  if (!activePoint.value) {
    return []
  }

  const point = activePoint.value
  const insights: string[] = []

  if (locale.value === 'zh') {
    if (point.status === 'decoupled') {
      insights.push(`${point.country} 在所选年份区间内落在“高增长 / 低排放”象限，是当前的脱钩样本。`)
    } else if (point.status === 'growth-with-emissions') {
      insights.push(`${point.country} 仍处于增长伴随排放上升的状态，适合作为对照样本。`)
    } else {
      insights.push(`${point.country} 不属于典型脱钩国家，但它能帮助解释边界情形。`)
    }
  } else {
    if (point.status === 'decoupled') {
      insights.push(`${point.country} falls in the high-growth / lower-emissions quadrant across the selected years, making it a decoupling case.`)
    } else if (point.status === 'growth-with-emissions') {
      insights.push(`${point.country} still grows together with rising emissions, so it works well as a comparison case.`)
    } else {
      insights.push(`${point.country} is not a classic decoupling country, but it helps explain the boundary cases.`)
    }
  }

  if (point.renewablesChangePts !== null) {
    if (locale.value === 'zh') {
      if (point.renewablesChangePts >= 10) {
        insights.push(`可再生能源占比提升了 ${formatNumber(point.renewablesChangePts, 1, locale.value)} 个百分点，说明能源转型较明显。`)
      } else if (point.renewablesChangePts <= -5) {
        insights.push(`可再生能源占比下降了 ${formatNumber(Math.abs(point.renewablesChangePts), 1, locale.value)} 个百分点，转型并不稳定。`)
      } else {
        insights.push('可再生能源占比变化有限，说明脱钩背后可能还有产业结构或效率因素。')
      }
    } else if (point.renewablesChangePts >= 10) {
      insights.push(`Renewables gained ${formatNumber(point.renewablesChangePts, 1, locale.value)} percentage points, pointing to a visible energy transition.`)
    } else if (point.renewablesChangePts <= -5) {
      insights.push(`Renewables fell by ${formatNumber(Math.abs(point.renewablesChangePts), 1, locale.value)} percentage points, so the transition is not stable.`)
    } else {
      insights.push('Renewables changed only slightly, so industrial structure or efficiency may explain part of the story.')
    }
  }

  const coalStart = point.startRecord.coalShareEnergy
  const coalEnd = point.endRecord.coalShareEnergy
  if (coalStart !== null && coalEnd !== null) {
    const coalDelta = coalEnd - coalStart
    if (locale.value === 'zh') {
      if (coalDelta <= -8) {
        insights.push(`煤炭占比下降了 ${formatNumber(Math.abs(coalDelta), 1, locale.value)} 个百分点，这是很强的结构变化信号。`)
      } else if (coalDelta >= 8) {
        insights.push(`煤炭占比反而上升了 ${formatNumber(coalDelta, 1, locale.value)} 个百分点，这会抵消部分减排努力。`)
      }
    } else if (coalDelta <= -8) {
      insights.push(`Coal fell by ${formatNumber(Math.abs(coalDelta), 1, locale.value)} percentage points, which is a strong structural signal.`)
    } else if (coalDelta >= 8) {
      insights.push(`Coal actually rose by ${formatNumber(coalDelta, 1, locale.value)} percentage points, offsetting part of the emissions effort.`)
    }
  }

  const metricValues = activeSeries.value
    .map((record) => ({ year: record.year, value: metricValue(record, selectedMetric.value) }))
    .filter((entry): entry is { year: number; value: number } => entry.value !== null)
  const peakMetric = [...metricValues].sort((left, right) => right.value - left.value)[0]

  if (peakMetric && peakMetric.year !== endYear.value) {
    insights.push(
      locale.value === 'zh'
        ? `该国当前指标峰值出现在 ${peakMetric.year} 年，说明后续阶段出现了回落或平台期。`
        : `This country peaks on the selected metric in ${peakMetric.year}, which suggests a later decline or plateau.`,
    )
  }

  if (activeStoryObject.value) {
    insights.push(
      locale.value === 'zh'
        ? `当前处于故事模式“${activeStoryObject.value.label}”，页面已自动切换到更适合讲述这一问题的国家组合。`
        : `You are in the "${activeStoryObject.value.label}" story mode, so the page has switched to the country set that best tells this comparison.`,
    )
  }

  return insights.slice(0, 4)
})

const activeStoryAnnotations = computed(() =>
  activeStory.value ? storyAnnotationMap[locale.value][activeStory.value] ?? [] : [],
)

const selectedSeriesGroups = computed(() =>
  selectedCountryObjects.value.map((country) => ({
    country: country.country,
    isoCode: country.isoCode,
    values:
      recordsByCountry.value
        .get(country.isoCode)
        ?.filter((record) => record.year >= startYear.value && record.year <= endYear.value) ?? [],
  })),
)

const highlightedStats = computed(() => ({
  countryCount: overviewPoints.value.length,
  decoupledCount: overviewPoints.value.filter((point) => point.status === 'decoupled').length,
}))

const sliderStyle = computed(() => {
  const total = maxYear.value - minYear.value || 1
  const left = ((startYear.value - minYear.value) / total) * 100
  const width = ((endYear.value - startYear.value) / total) * 100
  return {
    left: `${left}%`,
    width: `${Math.max(width, 1)}%`,
  }
})

const activeRegionLabel = computed(() =>
  activePoint.value ? displayRegion(activePoint.value.region) : null,
)
const activeIncomeLabel = computed(() =>
  activePoint.value ? displayIncome(activePoint.value.incomeLevel) : null,
)

function updateStartYearFromRange(value: number) {
  startYear.value = Math.min(value, endYear.value - 1)
}

function updateEndYearFromRange(value: number) {
  endYear.value = Math.max(value, startYear.value + 1)
}

function selectCountry(isoCode: string) {
  hoveredCountry.value = null
  activeStory.value = null

  if (selectedCountries.value.includes(isoCode)) {
    selectedCountries.value = [
      isoCode,
      ...selectedCountries.value.filter((currentIsoCode) => currentIsoCode !== isoCode),
    ]
    return
  }

  selectedCountries.value = [isoCode, ...selectedCountries.value].slice(0, 4)
}

function removeCountry(isoCode: string) {
  selectedCountries.value = selectedCountries.value.filter((currentIsoCode) => currentIsoCode !== isoCode)
}

function applyStory(story: StoryPreset) {
  activeStory.value = story.id
  selectedCountries.value = story.countries.slice(0, 4)
  if (story.metric) {
    selectedMetric.value = story.metric
  }
  if (story.startYear) {
    startYear.value = story.startYear
  }
  if (story.endYear) {
    endYear.value = story.endYear
  }
}

function resetExploration() {
  if (!meta.value) {
    return
  }

  searchQuery.value = ''
  regionFilter.value = 'All'
  incomeFilter.value = 'All'
  selectedMetric.value = 'co2PerCapita'
  startYear.value = meta.value.baselineYear
  endYear.value = meta.value.latestYear
  selectedCountries.value = [meta.value.featuredCountries[0] ?? 'DEU'].filter(Boolean)
  hoveredCountry.value = null
  activeStory.value = null
}
</script>

<template>
  <div class="app-shell">
    <template v-if="loading">
      <div class="loading-shell">
        <h1>{{ copy.loadingTitle }}</h1>
        <p>{{ copy.loadingBody }}</p>
      </div>
    </template>

    <template v-else-if="errorMessage">
      <div class="loading-shell">
        <h1>{{ copy.dataErrorTitle }}</h1>
        <p>{{ errorMessage }}</p>
      </div>
    </template>

    <template v-else>
      <header class="hero">
        <div class="hero__copy">
          <h1>{{ copy.title }}</h1>
          <p class="hero__lead">
            {{ copy.lead }}
            <template v-if="locale === 'zh'">
              当前有 <strong>{{ highlightedStats.countryCount }}</strong> 个国家具备完整数据，其中
              <strong>{{ highlightedStats.decoupledCount }}</strong> 个落在“高增长 / 低排放”象限。
            </template>
            <template v-else>
              <strong>{{ highlightedStats.countryCount }}</strong> countries have complete data, and
              <strong>{{ highlightedStats.decoupledCount }}</strong> of them fall in the high-growth / lower-emissions quadrant.
            </template>
          </p>
        </div>

        <div class="hero__stats">
          <div class="language-switch" role="group" aria-label="Language switch">
            <button
              type="button"
              :class="['language-switch__button', { 'language-switch__button--active': locale === 'zh' }]"
              @click="locale = 'zh'"
            >
              中文
            </button>
            <button
              type="button"
              :class="['language-switch__button', { 'language-switch__button--active': locale === 'en' }]"
              @click="locale = 'en'"
            >
              English
            </button>
          </div>

          <div class="hero-stat">
            <span class="hero-stat__label">{{ copy.statsMetric }}</span>
            <strong>{{ currentMetricLabel }}</strong>
          </div>
          <div class="hero-stat">
            <span class="hero-stat__label">{{ copy.statsRange }}</span>
            <strong>{{ startYear }} → {{ endYear }}</strong>
          </div>
          <div class="hero-stat">
            <span class="hero-stat__label">{{ copy.statsFocus }}</span>
            <strong>{{ activePoint?.country ?? copy.none }}</strong>
          </div>
        </div>

        <div class="story-strip">
          <button
            v-for="story in localizedStoryPresets"
            :key="story.id"
            type="button"
            :class="['story-button', { 'story-button--active': activeStory === story.id }]"
            @click="applyStory(story)"
          >
            <span>{{ story.label }}</span>
            <small>{{ story.description }}</small>
          </button>
          <button type="button" class="story-button story-button--ghost" @click="resetExploration">
            {{ copy.reset }}
          </button>
        </div>

        <div v-if="activeStoryObject" class="story-callout">
          <p class="eyebrow">{{ copy.storyFocus }}</p>
          <p>{{ activeStoryObject.description }} {{ copy.storyHint }}</p>
        </div>
      </header>

      <div class="workspace-grid">
        <aside class="controls controls--sidebar">
          <div class="controls__row">
            <label class="field">
              <span>{{ copy.search }}</span>
              <input
                v-model="searchQuery"
                type="search"
                :placeholder="copy.searchPlaceholder"
                list="country-options"
              />
            </label>

            <label class="field">
              <span>{{ copy.region }}</span>
              <select v-model="regionFilter">
                <option v-for="region in regionOptions" :key="region.value" :value="region.value">
                  {{ region.label }}
                </option>
              </select>
            </label>

            <label class="field">
              <span>{{ copy.income }}</span>
              <select v-model="incomeFilter">
                <option v-for="income in incomeOptions" :key="income.value" :value="income.value">
                  {{ income.label }}
                </option>
              </select>
            </label>

            <label class="field">
              <span>{{ copy.metric }}</span>
              <select v-model="selectedMetric">
                <option v-for="metric in metricOptions" :key="metric.value" :value="metric.value">
                  {{ metric.label }}
                </option>
              </select>
            </label>
          </div>

          <div class="controls__row controls__row--years">
            <label class="field">
              <span>{{ copy.startYear }}</span>
              <select v-model.number="startYear">
                <option v-for="year in years" :key="year" :value="year" :disabled="year >= endYear">
                  {{ year }}
                </option>
              </select>
            </label>

            <label class="field">
              <span>{{ copy.endYear }}</span>
              <select v-model.number="endYear">
                <option v-for="year in years" :key="year" :value="year" :disabled="year <= startYear">
                  {{ year }}
                </option>
              </select>
            </label>

            <div class="control-note">
              <span class="control-note__label">{{ copy.currentSelection }}</span>
              <strong>{{ currentMetricLabel }} · {{ formatNumber(overviewPoints.length, 0, locale) }}</strong>
            </div>
          </div>

          <div class="year-range">
            <div class="year-range__labels">
              <span>{{ copy.timeBrush }}</span>
              <strong>{{ startYear }} → {{ endYear }}</strong>
            </div>
            <div class="year-range__track">
              <div class="year-range__active" :style="sliderStyle"></div>
              <input
                class="year-range__input"
                type="range"
                :min="minYear"
                :max="maxYear"
                :value="startYear"
                @input="updateStartYearFromRange(Number(($event.target as HTMLInputElement).value))"
              />
              <input
                class="year-range__input"
                type="range"
                :min="minYear"
                :max="maxYear"
                :value="endYear"
                @input="updateEndYearFromRange(Number(($event.target as HTMLInputElement).value))"
              />
            </div>
            <div class="year-range__ticks">
              <span>{{ minYear }}</span>
              <span>{{ maxYear }}</span>
            </div>
          </div>

          <div class="selection-row">
            <span class="selection-row__title">{{ copy.compareGroup }}</span>
            <div class="selection-row__chips">
              <button
                v-for="country in selectedCountryObjects"
                :key="country.isoCode"
                type="button"
                class="selection-chip"
                @click="selectCountry(country.isoCode)"
              >
                {{ country.country }}
                <span class="selection-chip__remove" @click.stop="removeCountry(country.isoCode)">×</span>
              </button>
              <span v-if="!selectedCountryObjects.length" class="selection-row__empty">{{ copy.compareEmpty }}</span>
            </div>
          </div>

          <datalist id="country-options">
            <option v-for="country in meta?.countryOptions" :key="country.isoCode" :value="country.country"></option>
          </datalist>
        </aside>

        <main class="workspace-main">
          <div class="dashboard-grid">
            <section class="panel panel--full">
              <OverviewScatter
                :points="overviewPoints"
                :selected-countries="selectedCountries"
                :hovered-country="hoveredCountry"
                :metric-label="currentMetricLabel"
                :start-year="startYear"
                :end-year="endYear"
                :locale="locale"
                :annotations="activeStoryAnnotations"
                @select="selectCountry"
                @hover="hoveredCountry = $event"
              />
            </section>

            <section class="panel panel--main">
              <TrajectoryPanel
                :series-groups="selectedSeriesGroups"
                :metric-key="selectedMetric"
                :metric-label="currentMetricLabel"
                :locale="locale"
              />
            </section>

            <aside class="panel panel--side">
              <InsightPanel
                :point="activePoint"
                :selected-countries="selectedCountryObjects"
                :insights="activeInsights"
                :metric-label="currentMetricLabel"
                :story-label="activeStoryObject?.label ?? null"
                :locale="locale"
                :region-label="activeRegionLabel"
                :income-label="activeIncomeLabel"
              />
            </aside>

            <section class="panel panel--full">
              <EnergyMixPanel :series-groups="selectedSeriesGroups" :locale="locale" />
            </section>
          </div>
        </main>
      </div>

      <footer class="footer">
        <div>
          <p class="eyebrow">{{ copy.dataSources }}</p>
          <p>Our World in Data CO2, Our World in Data Energy, World Bank country metadata.</p>
        </div>
        <div>
          <p class="eyebrow">{{ copy.materials }}</p>

          <p class="footer__note">
            {{ copy.focusNote }}:
            <strong>{{ activePoint?.country ?? copy.none }}</strong>
            · GDP {{ formatSignedPercent(activePoint?.gdpChangePct ?? null, 1, locale) }}
            · {{ currentMetricLabel }} {{ formatSignedPercent(activePoint?.metricChangePct ?? null, 1, locale) }}
          </p>
        </div>
      </footer>
    </template>
  </div>
</template>
