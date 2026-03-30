<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { line } from 'd3-shape'
import { scaleLinear } from 'd3-scale'
import type { CountryYearRecord, Locale } from '../types'
import { formatShare, formatSignedPoints } from '../utils/formatters'

interface SeriesGroup {
  country: string
  isoCode: string
  values: CountryYearRecord[]
}

const props = defineProps<{
  seriesGroups: SeriesGroup[]
  locale: Locale
}>()

const copy = computed(() =>
  props.locale === 'zh'
    ? {
        eyebrow: '能源结构',
        title: '能源结构解释视图',
        trendMode: '趋势图',
        deltaMode: '起终点',
        compareMode: '多国比较',
        empty: '选中国家后，这里会展示能源结构解释视图。',
        trendDescription: '观察主国家在整个时间段内的能源占比变化，而不只看起点和终点。',
        compareDescription: '多国比较模式下，优先展示能解释“为何脱钩 / 未脱钩”的关键结构变化。',
        axisYear: '年份',
        axisShare: '一次能源占比',
        compareTitle: '比较洞察',
        headers: {
          country: '国家',
          renewables: '可再生能源',
          coal: '煤炭',
          fossil: '化石能源',
        },
        seriesLabels: {
          renewables: '可再生能源',
          coal: '煤炭',
          oil: '石油',
          gas: '天然气',
          nuclear: '核能',
        },
      }
    : {
        eyebrow: 'Energy Mix',
        title: 'Energy structure explanation view',
        trendMode: 'Trend',
        deltaMode: 'Start vs end',
        compareMode: 'Compare',
        empty: 'Select one or more countries to show the energy structure view.',
        trendDescription:
          'Track how the primary energy mix changes through the whole period instead of only comparing the start and end years.',
        compareDescription:
          'In compare mode, prioritize the structural shifts that best explain why countries do or do not decouple.',
        axisYear: 'Year',
        axisShare: 'Share of primary energy',
        compareTitle: 'Comparison insights',
        headers: {
          country: 'Country',
          renewables: 'Renewables',
          coal: 'Coal',
          fossil: 'Fossil',
        },
        seriesLabels: {
          renewables: 'Renewables',
          coal: 'Coal',
          oil: 'Oil',
          gas: 'Gas',
          nuclear: 'Nuclear',
        },
      },
)

const mode = ref<'trend' | 'delta' | 'compare'>('trend')

watch(
  () => props.seriesGroups.length,
  (count) => {
    if (count > 1) {
      mode.value = 'compare'
    } else if (count === 1 && mode.value === 'compare') {
      mode.value = 'trend'
    }
  },
  { immediate: true },
)

const primarySeries = computed(() => props.seriesGroups[0]?.values ?? [])

const energyRows = computed(() => {
  const start = primarySeries.value[0] ?? null
  const end = primarySeries.value.at(-1) ?? null

  return [
    {
      key: 'renewables',
      label: copy.value.seriesLabels.renewables,
      color: '#1f8f6a',
      start: start?.renewablesShareEnergy ?? null,
      end: end?.renewablesShareEnergy ?? null,
      values: primarySeries.value
        .map((record) => ({ year: record.year, value: record.renewablesShareEnergy }))
        .filter((point): point is { year: number; value: number } => point.value !== null),
    },
    {
      key: 'coal',
      label: copy.value.seriesLabels.coal,
      color: '#334542',
      start: start?.coalShareEnergy ?? null,
      end: end?.coalShareEnergy ?? null,
      values: primarySeries.value
        .map((record) => ({ year: record.year, value: record.coalShareEnergy }))
        .filter((point): point is { year: number; value: number } => point.value !== null),
    },
    {
      key: 'oil',
      label: copy.value.seriesLabels.oil,
      color: '#c96f36',
      start: start?.oilShareEnergy ?? null,
      end: end?.oilShareEnergy ?? null,
      values: primarySeries.value
        .map((record) => ({ year: record.year, value: record.oilShareEnergy }))
        .filter((point): point is { year: number; value: number } => point.value !== null),
    },
    {
      key: 'gas',
      label: copy.value.seriesLabels.gas,
      color: '#4d8686',
      start: start?.gasShareEnergy ?? null,
      end: end?.gasShareEnergy ?? null,
      values: primarySeries.value
        .map((record) => ({ year: record.year, value: record.gasShareEnergy }))
        .filter((point): point is { year: number; value: number } => point.value !== null),
    },
    {
      key: 'nuclear',
      label: copy.value.seriesLabels.nuclear,
      color: '#6b58c3',
      start: start?.nuclearShareEnergy ?? null,
      end: end?.nuclearShareEnergy ?? null,
      values: primarySeries.value
        .map((record) => ({ year: record.year, value: record.nuclearShareEnergy }))
        .filter((point): point is { year: number; value: number } => point.value !== null),
    },
  ].map((row) => ({
    ...row,
    delta: row.start !== null && row.end !== null ? row.end - row.start : null,
  }))
})

const compareRows = computed(() =>
  [...props.seriesGroups]
    .map((group) => {
      const start = group.values[0] ?? null
      const end = group.values.at(-1) ?? null

      const renewablesDelta =
        start?.renewablesShareEnergy !== null && start?.renewablesShareEnergy !== undefined
        && end?.renewablesShareEnergy !== null && end?.renewablesShareEnergy !== undefined
          ? end.renewablesShareEnergy - start.renewablesShareEnergy
          : null
      const coalDelta =
        start?.coalShareEnergy !== null && start?.coalShareEnergy !== undefined
        && end?.coalShareEnergy !== null && end?.coalShareEnergy !== undefined
          ? end.coalShareEnergy - start.coalShareEnergy
          : null
      const fossilDelta =
        start?.fossilShareEnergy !== null && start?.fossilShareEnergy !== undefined
        && end?.fossilShareEnergy !== null && end?.fossilShareEnergy !== undefined
          ? end.fossilShareEnergy - start.fossilShareEnergy
          : null

      return {
        country: group.country,
        isoCode: group.isoCode,
        renewablesStart: start?.renewablesShareEnergy ?? null,
        renewablesEnd: end?.renewablesShareEnergy ?? null,
        renewablesDelta,
        coalStart: start?.coalShareEnergy ?? null,
        coalEnd: end?.coalShareEnergy ?? null,
        coalDelta,
        fossilStart: start?.fossilShareEnergy ?? null,
        fossilEnd: end?.fossilShareEnergy ?? null,
        fossilDelta,
      }
    })
    .sort((left, right) => (right.renewablesDelta ?? -Infinity) - (left.renewablesDelta ?? -Infinity)),
)

const compareInsights = computed(() => {
  if (compareRows.value.length < 2) {
    return []
  }

  const bestRenewables = [...compareRows.value]
    .filter((row) => row.renewablesDelta !== null)
    .sort((left, right) => (right.renewablesDelta ?? -Infinity) - (left.renewablesDelta ?? -Infinity))[0]
  const strongestCoalDrop = [...compareRows.value]
    .filter((row) => row.coalDelta !== null)
    .sort((left, right) => (left.coalDelta ?? Infinity) - (right.coalDelta ?? Infinity))[0]

  const insights = []
  if (bestRenewables) {
    insights.push(
      props.locale === 'zh'
        ? `${bestRenewables.country} 的可再生能源占比提升最多，为 ${formatSignedPoints(bestRenewables.renewablesDelta, 1, props.locale)}。`
        : `${bestRenewables.country} posts the largest renewables gain at ${formatSignedPoints(bestRenewables.renewablesDelta, 1, props.locale)}.`,
    )
  }
  if (strongestCoalDrop) {
    insights.push(
      props.locale === 'zh'
        ? `${strongestCoalDrop.country} 的煤炭占比下降最明显，为 ${formatSignedPoints(strongestCoalDrop.coalDelta, 1, props.locale)}。`
        : `${strongestCoalDrop.country} shows the sharpest coal decline at ${formatSignedPoints(strongestCoalDrop.coalDelta, 1, props.locale)}.`,
    )
  }

  return insights
})

const width = 760
const height = 300
const margin = { top: 20, right: 18, bottom: 42, left: 48 }
const innerWidth = width - margin.left - margin.right
const innerHeight = height - margin.top - margin.bottom

const xScale = computed(() => {
  const firstYear = primarySeries.value[0]?.year ?? 1990
  const lastYear = primarySeries.value.at(-1)?.year ?? 2022
  return scaleLinear().domain([firstYear, lastYear]).range([0, innerWidth])
})

const yScale = computed(() => scaleLinear().domain([0, 100]).range([innerHeight, 0]))

const lineBuilder = line<{ year: number; value: number }>()
  .x((point) => xScale.value(point.year))
  .y((point) => yScale.value(point.value))
</script>

<template>
  <div class="chart-card">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">{{ copy.eyebrow }}</p>
        <h2>{{ copy.title }}</h2>
      </div>

      <div class="mode-switch">
        <button
          type="button"
          :class="['mode-switch__button', { 'mode-switch__button--active': mode === 'trend' }]"
          :disabled="seriesGroups.length > 1"
          @click="mode = 'trend'"
        >
          {{ copy.trendMode }}
        </button>
        <button
          type="button"
          :class="['mode-switch__button', { 'mode-switch__button--active': mode === 'delta' }]"
          :disabled="seriesGroups.length > 1"
          @click="mode = 'delta'"
        >
          {{ copy.deltaMode }}
        </button>
        <button
          type="button"
          :class="['mode-switch__button', { 'mode-switch__button--active': mode === 'compare' }]"
          :disabled="seriesGroups.length <= 1"
          @click="mode = 'compare'"
        >
          {{ copy.compareMode }}
        </button>
      </div>
    </div>

    <div v-if="!seriesGroups.length" class="empty-state">{{ copy.empty }}</div>

    <template v-else-if="mode === 'trend'">
      <p class="panel-copy trajectory-copy panel-copy--wide">{{ copy.trendDescription }}</p>

      <svg :viewBox="`0 0 ${width} ${height}`" class="line-svg">
        <g :transform="`translate(${margin.left}, ${margin.top})`">
          <line class="axis-line" :x1="0" :x2="innerWidth" :y1="innerHeight" :y2="innerHeight" />
          <line class="axis-line" :x1="0" :x2="0" :y1="0" :y2="innerHeight" />
          <line class="grid-line" :x1="0" :x2="innerWidth" :y1="yScale(50)" :y2="yScale(50)" />
          <text class="grid-label" x="8" :y="yScale(50) - 8">50%</text>

          <g v-for="row in energyRows" :key="row.key">
            <path
              v-if="row.values.length >= 2"
              :d="lineBuilder(row.values) ?? undefined"
              class="line"
              :stroke="row.color"
            />
          </g>

          <text class="axis-title" :x="innerWidth / 2" :y="innerHeight + 34">{{ copy.axisYear }}</text>
          <text class="axis-title axis-title--y" :x="-innerHeight / 2" :y="-34">{{ copy.axisShare }}</text>
        </g>
      </svg>

      <div class="trajectory-legend">
        <div v-for="row in energyRows" :key="row.key" class="legend-item">
          <span class="legend-swatch" :style="{ backgroundColor: row.color }"></span>
          {{ row.label }}
        </div>
      </div>
    </template>

    <div v-else-if="mode === 'delta'" class="mix-table">
      <div v-for="row in energyRows" :key="row.key" class="mix-row">
        <div class="mix-row__meta">
          <strong>{{ row.label }}</strong>
          <span>{{ formatSignedPoints(row.delta, 1, locale) }}</span>
        </div>
        <div class="mix-row__bars">
          <div class="mix-row__column">
            <span class="mix-row__year">{{ primarySeries[0]?.year }}</span>
            <div class="mix-row__track">
              <div class="mix-row__bar" :style="{ width: `${row.start ?? 0}%`, backgroundColor: row.color }"></div>
            </div>
            <span class="mix-row__value">{{ formatShare(row.start, 1, locale) }}</span>
          </div>
          <div class="mix-row__column">
            <span class="mix-row__year">{{ primarySeries.at(-1)?.year }}</span>
            <div class="mix-row__track">
              <div class="mix-row__bar" :style="{ width: `${row.end ?? 0}%`, backgroundColor: row.color }"></div>
            </div>
            <span class="mix-row__value">{{ formatShare(row.end, 1, locale) }}</span>
          </div>
        </div>
      </div>
    </div>

    <template v-else>
      <p class="panel-copy trajectory-copy panel-copy--wide">{{ copy.compareDescription }}</p>

      <div class="compare-table">
        <div class="compare-table__header compare-table__row">
          <span>{{ copy.headers.country }}</span>
          <span>{{ copy.headers.renewables }}</span>
          <span>{{ copy.headers.coal }}</span>
          <span>{{ copy.headers.fossil }}</span>
        </div>
        <div v-for="row in compareRows" :key="row.isoCode" class="compare-table__row">
          <strong>{{ row.country }}</strong>
          <div class="compare-cell">
            <span>{{ formatShare(row.renewablesStart, 1, locale) }} → {{ formatShare(row.renewablesEnd, 1, locale) }}</span>
            <strong>{{ formatSignedPoints(row.renewablesDelta, 1, locale) }}</strong>
          </div>
          <div class="compare-cell">
            <span>{{ formatShare(row.coalStart, 1, locale) }} → {{ formatShare(row.coalEnd, 1, locale) }}</span>
            <strong>{{ formatSignedPoints(row.coalDelta, 1, locale) }}</strong>
          </div>
          <div class="compare-cell">
            <span>{{ formatShare(row.fossilStart, 1, locale) }} → {{ formatShare(row.fossilEnd, 1, locale) }}</span>
            <strong>{{ formatSignedPoints(row.fossilDelta, 1, locale) }}</strong>
          </div>
        </div>
      </div>

      <div v-if="compareInsights.length" class="compare-insights">
        <p class="selection-title">{{ copy.compareTitle }}</p>
        <ul>
          <li v-for="insight in compareInsights" :key="insight">{{ insight }}</li>
        </ul>
      </div>
    </template>
  </div>
</template>
