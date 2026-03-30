<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { line } from 'd3-shape'
import { scaleLinear } from 'd3-scale'
import type { CountryYearRecord, Locale, MetricKey } from '../types'
import { formatNumber, formatShare, formatSignedPercent } from '../utils/formatters'

interface SeriesGroup {
  country: string
  isoCode: string
  values: CountryYearRecord[]
}

interface TooltipRow {
  label: string
  value: string
}

const props = defineProps<{
  seriesGroups: SeriesGroup[]
  metricKey: MetricKey
  metricLabel: string
  locale: Locale
}>()

const copy = computed(() =>
  props.locale === 'zh'
    ? {
        eyebrow: '历史路径',
        title: '历史路径与比较视图',
        pathMode: '轨迹图',
        lineMode: '折线图',
        empty: '先选中国家后，这里会展示历史路径与比较模式。',
        pathDescription: '在和总览相同的坐标系中，观察国家是如何一步步走到当前象限的。',
        singleLineDescription: '单国模式下，比较经济与排放两条指数曲线的偏离程度。',
        multiLineDescription: '多国模式下，比较各国在同一指标上的相对变化速度。',
        axisGdp: '人均 GDP 变化',
        axisMetric: '排放指标变化',
        axisYear: '年份',
        baseLine: '100 = 起点年份',
        year: '年份',
        gdpChange: '人均 GDP 变化',
        metricChange: '排放指标变化',
        indexValue: '指数值',
        legendHint: '点击图例可高亮并锁定一条路径。',
        renewables: '可再生能源占比',
        gdpIndex: '人均 GDP 指数',
        metricIndex: `${props.metricLabel} 指数`,
      }
    : {
        eyebrow: 'Trajectory',
        title: 'Historical paths and comparison view',
        pathMode: 'Path',
        lineMode: 'Line',
        empty: 'Select one or more countries to show the historical path and comparison view.',
        pathDescription:
          'Use the same coordinate system as the overview scatter to see how a country moved into its current quadrant.',
        singleLineDescription:
          'In single-country mode, compare the divergence between the GDP and emissions index curves.',
        multiLineDescription:
          'In multi-country mode, compare how quickly each country changes on the same emissions metric.',
        axisGdp: 'GDP per capita change',
        axisMetric: 'Emissions metric change',
        axisYear: 'Year',
        baseLine: '100 = start year',
        year: 'Year',
        gdpChange: 'GDP per capita change',
        metricChange: 'Metric change',
        indexValue: 'Index value',
        legendHint: 'Click a legend item to highlight and lock a series.',
        renewables: 'Renewables share',
        gdpIndex: 'GDP per capita index',
        metricIndex: `${props.metricLabel} index`,
      },
)

const mode = ref<'path' | 'line'>('path')
const hoveredSeriesKey = ref<string | null>(null)
const pinnedSeriesKey = ref<string | null>(null)
const tooltip = ref<{ title: string; subtitle: string; rows: TooltipRow[] } | null>(null)
const tooltipStyle = ref({ left: '0px', top: '0px' })

watch(
  () => props.seriesGroups.length,
  (count) => {
    if (count > 1) {
      mode.value = 'line'
    }
  },
  { immediate: true },
)

watch(mode, () => {
  tooltip.value = null
  hoveredSeriesKey.value = null
  pinnedSeriesKey.value = null
})

const width = 760
const height = 340
const margin = { top: 22, right: 18, bottom: 42, left: 54 }
const innerWidth = width - margin.left - margin.right
const innerHeight = height - margin.top - margin.bottom

const palette = ['#1f8f6a', '#245f8f', '#ca6d34', '#6b58c3']

function metricValue(record: CountryYearRecord, metricKey: MetricKey) {
  if (metricKey === 'co2') {
    return record.co2
  }

  if (metricKey === 'consumptionCo2PerCapita') {
    return record.consumptionCo2PerCapita
  }

  return record.co2PerCapita
}

function firstAvailable(values: Array<number | null>) {
  return values.find((value) => value !== null) ?? null
}

function normalize(value: number | null, base: number | null) {
  if (value === null || base === null || base === 0) {
    return null
  }

  return (value / base) * 100
}

function percentChange(start: number | null, end: number | null) {
  if (start === null || end === null || start === 0) {
    return null
  }

  return ((end - start) / start) * 100
}

const pathSeries = computed(() =>
  props.seriesGroups.map((group, index) => {
    const gdpBase = firstAvailable(group.values.map((record) => record.gdpPerCapita))
    const metricBase = firstAvailable(group.values.map((record) => metricValue(record, props.metricKey)))

    return {
      country: group.country,
      isoCode: group.isoCode,
      color: palette[index % palette.length],
      values: group.values
        .map((record) => ({
          year: record.year,
          x: percentChange(gdpBase, record.gdpPerCapita),
          y: percentChange(metricBase, metricValue(record, props.metricKey)),
        }))
        .filter(
          (point): point is { year: number; x: number; y: number } =>
            point.x !== null && point.y !== null,
        ),
    }
  }),
)

const pathPoints = computed(() => pathSeries.value.flatMap((group) => group.values))

function paddedDomain(values: number[]) {
  if (!values.length) {
    return [-20, 20]
  }

  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const padding = (max - min) * 0.15 || 10
  return [min - padding, max + padding]
}

const pathXScale = computed(() =>
  scaleLinear().domain(paddedDomain(pathPoints.value.map((point) => point.x))).range([0, innerWidth]),
)

const pathYScale = computed(() =>
  scaleLinear().domain(paddedDomain(pathPoints.value.map((point) => point.y))).range([innerHeight, 0]),
)

const pathLine = line<{ year: number; x: number; y: number }>()
  .x((point) => pathXScale.value(point.x))
  .y((point) => pathYScale.value(point.y))

const lineModeSeries = computed(() => {
  if (!props.seriesGroups.length) {
    return []
  }

  if (props.seriesGroups.length === 1) {
    const [group] = props.seriesGroups
    const gdpBase = firstAvailable(group.values.map((record) => record.gdpPerCapita))
    const metricBase = firstAvailable(group.values.map((record) => metricValue(record, props.metricKey)))

    return [
      {
        key: 'gdp',
        label: copy.value.gdpIndex,
        color: '#245f8f',
        values: group.values
          .map((record) => ({ year: record.year, value: normalize(record.gdpPerCapita, gdpBase) }))
          .filter((point): point is { year: number; value: number } => point.value !== null),
      },
      {
        key: 'metric',
        label: copy.value.metricIndex,
        color: '#ca6d34',
        values: group.values
          .map((record) => ({
            year: record.year,
            value: normalize(metricValue(record, props.metricKey), metricBase),
          }))
          .filter((point): point is { year: number; value: number } => point.value !== null),
      },
    ]
  }

  return props.seriesGroups.map((group, index) => {
    const metricBase = firstAvailable(group.values.map((record) => metricValue(record, props.metricKey)))

    return {
      key: group.isoCode,
      label: group.country,
      color: palette[index % palette.length],
      values: group.values
        .map((record) => ({
          year: record.year,
          value: normalize(metricValue(record, props.metricKey), metricBase),
        }))
        .filter((point): point is { year: number; value: number } => point.value !== null),
    }
  })
})

const lineYears = computed(() => {
  const years = props.seriesGroups.flatMap((group) => group.values.map((record) => record.year))
  return [Math.min(...years, 1990), Math.max(...years, 2022)]
})

const lineXScale = computed(() => scaleLinear().domain(lineYears.value).range([0, innerWidth]))

const lineYScale = computed(() => {
  const values = lineModeSeries.value.flatMap((series) => series.values.map((point) => point.value))
  const maxValue = values.length ? Math.max(120, ...values.map((value) => Math.ceil(value / 10) * 10)) : 120
  return scaleLinear().domain([0, maxValue]).range([innerHeight, 0])
})

const lineBuilder = line<{ year: number; value: number }>()
  .x((point) => lineXScale.value(point.year))
  .y((point) => lineYScale.value(point.value))

const renewableStart = computed(() => {
  const [primaryGroup] = props.seriesGroups
  return primaryGroup?.values.find((point) => point.renewablesShareEnergy !== null) ?? null
})

const renewableEnd = computed(() => {
  const [primaryGroup] = props.seriesGroups
  return [...(primaryGroup?.values ?? [])].reverse().find((point) => point.renewablesShareEnergy !== null) ?? null
})

const activeSeriesKey = computed(() => pinnedSeriesKey.value ?? hoveredSeriesKey.value)

function seriesOpacity(key: string) {
  if (!activeSeriesKey.value) {
    return 1
  }

  return activeSeriesKey.value === key ? 1 : 0.18
}

function setTooltipPosition(event: MouseEvent) {
  const currentTarget = event.currentTarget as SVGElement | null
  const svg = currentTarget?.ownerSVGElement
  if (!svg) {
    return
  }

  const svgRect = svg.getBoundingClientRect()
  tooltipStyle.value = {
    left: `${event.clientX - svgRect.left + 14}px`,
    top: `${Math.max(event.clientY - svgRect.top - 12, 18)}px`,
  }
}

function showPathTooltip(
  event: MouseEvent,
  series: { country: string; isoCode: string },
  point: { year: number; x: number; y: number },
) {
  hoveredSeriesKey.value = series.isoCode
  setTooltipPosition(event)
  tooltip.value = {
    title: series.country,
    subtitle: `${copy.value.year} ${point.year}`,
    rows: [
      { label: copy.value.gdpChange, value: formatSignedPercent(point.x, 1, props.locale) },
      { label: copy.value.metricChange, value: formatSignedPercent(point.y, 1, props.locale) },
    ],
  }
}

function showLineTooltip(
  event: MouseEvent,
  series: { key: string; label: string },
  point: { year: number; value: number },
) {
  hoveredSeriesKey.value = series.key
  setTooltipPosition(event)
  tooltip.value = {
    title: series.label,
    subtitle: `${copy.value.year} ${point.year}`,
    rows: [{ label: copy.value.indexValue, value: formatNumber(point.value, 1, props.locale) }],
  }
}

function handleMove(event: MouseEvent) {
  if (!tooltip.value) {
    return
  }

  setTooltipPosition(event)
}

function clearTooltip() {
  tooltip.value = null
  if (!pinnedSeriesKey.value) {
    hoveredSeriesKey.value = null
  }
}

function hoverSeries(key: string | null) {
  if (!pinnedSeriesKey.value) {
    hoveredSeriesKey.value = key
  }
}

function togglePinnedSeries(key: string) {
  pinnedSeriesKey.value = pinnedSeriesKey.value === key ? null : key
  hoveredSeriesKey.value = pinnedSeriesKey.value
}
</script>

<template>
  <div class="chart-card chart-card--interactive">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">{{ copy.eyebrow }}</p>
        <h2>{{ copy.title }}</h2>
      </div>

      <div class="mode-switch">
        <button
          type="button"
          :class="['mode-switch__button', { 'mode-switch__button--active': mode === 'path' }]"
          @click="mode = 'path'"
        >
          {{ copy.pathMode }}
        </button>
        <button
          type="button"
          :class="['mode-switch__button', { 'mode-switch__button--active': mode === 'line' }]"
          @click="mode = 'line'"
        >
          {{ copy.lineMode }}
        </button>
      </div>
    </div>

    <div v-if="!seriesGroups.length" class="empty-state">{{ copy.empty }}</div>

    <template v-else-if="mode === 'path'">
      <p class="panel-copy trajectory-copy panel-copy--wide">{{ copy.pathDescription }}</p>

      <svg :viewBox="`0 0 ${width} ${height}`" class="line-svg">
        <g :transform="`translate(${margin.left}, ${margin.top})`">
          <line
            class="axis-line axis-line--cross"
            :x1="0"
            :x2="innerWidth"
            :y1="pathYScale(0)"
            :y2="pathYScale(0)"
          />
          <line
            class="axis-line axis-line--cross"
            :x1="pathXScale(0)"
            :x2="pathXScale(0)"
            :y1="0"
            :y2="innerHeight"
          />
          <line class="axis-line" :x1="0" :x2="innerWidth" :y1="innerHeight" :y2="innerHeight" />
          <line class="axis-line" :x1="0" :x2="0" :y1="0" :y2="innerHeight" />

          <g
            v-for="series in pathSeries"
            :key="series.isoCode"
            @mouseenter="hoverSeries(series.isoCode)"
            @mouseleave="hoverSeries(null)"
          >
            <path
              v-if="series.values.length >= 2"
              :d="pathLine(series.values) ?? undefined"
              class="trajectory-path"
              :stroke="series.color"
              :style="{ opacity: seriesOpacity(series.isoCode) }"
            />

            <g v-for="(point, index) in series.values" :key="`${series.isoCode}-${point.year}`">
              <circle
                class="trajectory-node"
                :cx="pathXScale(point.x)"
                :cy="pathYScale(point.y)"
                :r="index === series.values.length - 1 ? 5.5 : 3.5"
                :fill="series.color"
                :style="{ opacity: seriesOpacity(series.isoCode) }"
                @mouseenter="showPathTooltip($event, series, point)"
                @mousemove="handleMove($event)"
                @mouseleave="clearTooltip"
              />
              <text
                v-if="index === series.values.length - 1"
                class="point-label"
                :x="pathXScale(point.x) + 10"
                :y="pathYScale(point.y) - 10"
                :style="{ opacity: seriesOpacity(series.isoCode) }"
              >
                {{ series.country }}
              </text>
            </g>
          </g>

          <text class="axis-title" :x="innerWidth / 2" :y="innerHeight + 34">{{ copy.axisGdp }}</text>
          <text class="axis-title axis-title--y" :x="-innerHeight / 2" :y="-38">
            {{ copy.axisMetric }}
          </text>
        </g>
      </svg>
    </template>

    <template v-else>
      <p class="panel-copy trajectory-copy panel-copy--wide">
        {{ seriesGroups.length > 1 ? copy.multiLineDescription : copy.singleLineDescription }}
      </p>

      <svg :viewBox="`0 0 ${width} ${height}`" class="line-svg">
        <g :transform="`translate(${margin.left}, ${margin.top})`">
          <line class="axis-line" :x1="0" :x2="innerWidth" :y1="innerHeight" :y2="innerHeight" />
          <line class="axis-line" :x1="0" :x2="0" :y1="0" :y2="innerHeight" />
          <line class="grid-line" :x1="0" :x2="innerWidth" :y1="lineYScale(100)" :y2="lineYScale(100)" />
          <text class="grid-label" x="8" :y="lineYScale(100) - 8">{{ copy.baseLine }}</text>

          <g
            v-for="series in lineModeSeries"
            :key="series.key"
            @mouseenter="hoverSeries(series.key)"
            @mouseleave="hoverSeries(null)"
          >
            <path
              v-if="series.values.length >= 2"
              :d="lineBuilder(series.values) ?? undefined"
              class="line"
              :stroke="series.color"
              :style="{ opacity: seriesOpacity(series.key) }"
            />
            <circle
              v-for="point in series.values"
              :key="`${series.key}-${point.year}`"
              class="line-point"
              :fill="series.color"
              :cx="lineXScale(point.year)"
              :cy="lineYScale(point.value)"
              r="3.2"
              :style="{ opacity: seriesOpacity(series.key) }"
              @mouseenter="showLineTooltip($event, series, point)"
              @mousemove="handleMove($event)"
              @mouseleave="clearTooltip"
            />
          </g>

          <text class="axis-title" :x="innerWidth / 2" :y="innerHeight + 34">{{ copy.axisYear }}</text>
        </g>
      </svg>

      <div class="trajectory-legend trajectory-legend--interactive">
        <button
          v-for="series in lineModeSeries"
          :key="series.key"
          type="button"
          :class="[
            'legend-item',
            'legend-item--button',
            { 'legend-item--active': activeSeriesKey === series.key || !activeSeriesKey },
          ]"
          @click="togglePinnedSeries(series.key)"
        >
          <span class="legend-swatch" :style="{ backgroundColor: series.color }"></span>
          {{ series.label }}
        </button>
        <div v-if="seriesGroups.length === 1" class="legend-item legend-item--note">
          {{ copy.renewables }}:
          <strong>{{ formatShare(renewableStart?.renewablesShareEnergy ?? null, 1, locale) }}</strong>
          →
          <strong>{{ formatShare(renewableEnd?.renewablesShareEnergy ?? null, 1, locale) }}</strong>
        </div>
      </div>
      <p class="panel-note">{{ copy.legendHint }}</p>
    </template>

    <div v-if="tooltip" class="chart-tooltip" :style="tooltipStyle">
      <div class="chart-tooltip__top">
        <strong>{{ tooltip.title }}</strong>
        <span>{{ tooltip.subtitle }}</span>
      </div>
      <div class="chart-tooltip__comparison">
        <div v-for="row in tooltip.rows" :key="row.label">
          <span>{{ row.label }}</span>
          <strong>{{ row.value }}</strong>
        </div>
      </div>
    </div>
  </div>
</template>
