<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { extent } from 'd3-array'
import { scaleLinear, scaleSqrt } from 'd3-scale'
import type { Locale, OverviewPoint } from '../types'
import {
  formatCompactNumber,
  formatNumber,
  formatSignedPercent,
  formatSignedPoints,
} from '../utils/formatters'

const props = defineProps<{
  points: OverviewPoint[]
  selectedCountries: string[]
  hoveredCountry: string | null
  metricLabel: string
  startYear: number
  endYear: number
  locale: Locale
  annotations: Array<{
    isoCode: string
    title: string
    body: string
    dx: number
    dy: number
  }>
}>()

const emit = defineEmits<{
  select: [isoCode: string]
  hover: [isoCode: string | null]
  boxSelect: [isoCodes: string[]]
}>()

const copy = computed(() =>
  props.locale === 'zh'
    ? {
        eyebrow: '总览散点',
        title: '谁真的实现了“增长但减排”？',
        description:
          '横轴是人均 GDP 变化，纵轴是排放指标变化。气泡越大，终点年份的人口规模越大。',
        empty: '当前筛选条件下没有足够数据的国家。请放宽筛选条件或调整年份范围。',
        q1: '低增长 / 低排放',
        q2: '高增长 / 高排放',
        q3: '低增长 / 高排放',
        q4: '高增长 / 低排放',
        axisX: '人均 GDP 变化',
        axisY: '排放指标变化',
        tooltipRange: '时间范围',
        tooltipPopulation: '人口',
        tooltipGdp: '人均 GDP',
        tooltipMetric: '排放指标',
        tooltipRenewables: '可再生能源',
        tooltipGdpValues: '人均 GDP 起终值',
        tooltipMetricValues: '排放指标起终值',
        tooltipRenewablesValues: '可再生能源占比',
        statusDecoupled: '长期脱钩',
        statusGrowth: '增长伴随排放',
        statusLowLow: '低增长 / 低排放',
        statusLowHigh: '低增长 / 高排放',
        legendTitle: '图例',
        legendPopulation: '气泡面积表示终点年份人口规模；点击国家可加入或取消比较。',
        zoomIn: '放大',
        zoomOut: '缩小',
        zoomReset: '重置视图',
        interactionHint: '滚轮或按钮可缩放；在空白区域拖出矩形即可框选国家；点击国家可直接选中或取消。',
        selectionCount: '框选命中',
      }
    : {
        eyebrow: 'Overview Scatter',
        title: 'Who is actually growing while cutting emissions?',
        description:
          'The x-axis shows GDP per capita change, the y-axis shows emissions change, and larger bubbles indicate bigger end-year populations.',
        empty: 'No countries have enough data under the current filters. Try widening the filters or adjusting the year range.',
        q1: 'Low growth / lower emissions',
        q2: 'High growth / higher emissions',
        q3: 'Low growth / higher emissions',
        q4: 'High growth / lower emissions',
        axisX: 'GDP per capita change',
        axisY: 'Emissions metric change',
        tooltipRange: 'Time range',
        tooltipPopulation: 'Population',
        tooltipGdp: 'GDP / cap',
        tooltipMetric: 'Metric',
        tooltipRenewables: 'Renewables',
        tooltipGdpValues: 'GDP / cap values',
        tooltipMetricValues: 'Metric values',
        tooltipRenewablesValues: 'Renewables share',
        statusDecoupled: 'Long-run decoupling',
        statusGrowth: 'Growth with emissions',
        statusLowLow: 'Low growth / lower emissions',
        statusLowHigh: 'Low growth / higher emissions',
        legendTitle: 'Legend',
        legendPopulation: 'Bubble area represents end-year population. Click a country to add or remove it from the compare set.',
        zoomIn: 'Zoom in',
        zoomOut: 'Zoom out',
        zoomReset: 'Reset view',
        interactionHint: 'Use the mouse wheel or buttons to zoom. Drag a rectangle over empty space to brush countries, and click a country to toggle it.',
        selectionCount: 'Brushed',
      },
)

const width = 980
const height = 540
const margin = { top: 44, right: 26, bottom: 64, left: 84 }
const innerWidth = width - margin.left - margin.right
const innerHeight = height - margin.top - margin.bottom
const plotClipId = 'overview-scatter-clip'
const minZoom = 1
const maxZoom = 8

type BrushRect = {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

type ViewTransform = {
  x: number
  y: number
  k: number
}

const svgRef = ref<SVGSVGElement | null>(null)
const currentTransform = ref<ViewTransform>({ x: 0, y: 0, k: 1 })
const tooltipPoint = ref<OverviewPoint | null>(null)
const tooltipStyle = ref({ left: '0px', top: '0px' })
const brushRect = ref<BrushRect | null>(null)
const brushedCountryCount = ref(0)

function paddedDomain(values: number[]) {
  if (!values.length) {
    return [-20, 20]
  }

  const [rawMin, rawMax] = extent(values) as [number | undefined, number | undefined]
  const min = Math.min(rawMin ?? -20, 0)
  const max = Math.max(rawMax ?? 20, 0)
  const padding = (max - min) * 0.12 || 10
  return [min - padding, max + padding]
}

const sortedPoints = computed(() =>
  [...props.points].sort((left, right) => {
    const leftPriority = props.selectedCountries.includes(left.isoCode) ? 2 : left.featured ? 1 : 0
    const rightPriority = props.selectedCountries.includes(right.isoCode) ? 2 : right.featured ? 1 : 0

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority
    }

    return (left.endRecord.population ?? 0) - (right.endRecord.population ?? 0)
  }),
)

const xScale = computed(() =>
  scaleLinear().domain(paddedDomain(props.points.map((point) => point.gdpChangePct))).range([0, innerWidth]),
)

const yScale = computed(() =>
  scaleLinear()
    .domain(paddedDomain(props.points.map((point) => point.metricChangePct)))
    .range([innerHeight, 0]),
)

const radiusScale = computed(() => {
  const values = props.points
    .map((point) => point.endRecord.population)
    .filter((value): value is number => value !== null)

  if (!values.length) {
    return () => 5
  }

  const [minValue, maxValue] = extent(values) as [number, number]
  return scaleSqrt().domain([minValue, maxValue]).range([4, 13.5])
})

const zeroX = computed(() => xScale.value(0))
const zeroY = computed(() => yScale.value(0))
const selectedSet = computed(() => new Set(props.selectedCountries))
const plotTransform = computed(
  () =>
    `translate(${currentTransform.value.x}, ${currentTransform.value.y}) scale(${currentTransform.value.k})`,
)
const zoomPercent = computed(() => Math.round(currentTransform.value.k * 100))

const legendItems = computed(() => [
  { key: 'decoupled', label: copy.value.statusDecoupled },
  { key: 'growth', label: copy.value.statusGrowth },
  { key: 'boundary', label: props.locale === 'zh' ? '其他边界样本' : 'Other boundary cases' },
])

const plottedAnnotations = computed(() =>
  props.annotations
    .map((annotation) => {
      const point = props.points.find((item) => item.isoCode === annotation.isoCode) ?? null
      if (!point) {
        return null
      }

      return { ...annotation, point }
    })
    .filter(
      (
        annotation,
      ): annotation is {
        isoCode: string
        title: string
        body: string
        dx: number
        dy: number
        point: OverviewPoint
      } => annotation !== null,
    ),
)

const brushBounds = computed(() => {
  if (!brushRect.value) {
    return null
  }

  const x = Math.min(brushRect.value.startX, brushRect.value.currentX)
  const y = Math.min(brushRect.value.startY, brushRect.value.currentY)
  const widthValue = Math.abs(brushRect.value.currentX - brushRect.value.startX)
  const heightValue = Math.abs(brushRect.value.currentY - brushRect.value.startY)

  return { x, y, width: widthValue, height: heightValue }
})

function pointClass(point: OverviewPoint) {
  const classes = ['point', `point--${point.status}`]

  if (selectedSet.value.has(point.isoCode)) {
    classes.push('point--selected')
  } else if (props.hoveredCountry === point.isoCode) {
    classes.push('point--hovered')
  } else if (point.featured) {
    classes.push('point--featured')
  }

  return classes.join(' ')
}

function pointRadius(point: OverviewPoint) {
  const base = radiusScale.value(point.endRecord.population ?? 0)
  return selectedSet.value.has(point.isoCode) ? base + 2 : base
}

function statusLabel(point: OverviewPoint) {
  if (point.status === 'decoupled') {
    return copy.value.statusDecoupled
  }

  if (point.status === 'growth-with-emissions') {
    return copy.value.statusGrowth
  }

  if (point.status === 'low-growth-lower-emissions') {
    return copy.value.statusLowLow
  }

  return copy.value.statusLowHigh
}

function clampTransform(transform: ViewTransform) {
  const k = Math.min(maxZoom, Math.max(minZoom, transform.k))
  const minX = innerWidth - innerWidth * k
  const minY = innerHeight - innerHeight * k

  return {
    k,
    x: Math.min(0, Math.max(minX, transform.x)),
    y: Math.min(0, Math.max(minY, transform.y)),
  }
}

function projectPoint(x: number, y: number) {
  return {
    x: currentTransform.value.x + x * currentTransform.value.k,
    y: currentTransform.value.y + y * currentTransform.value.k,
  }
}

function pointPosition(point: OverviewPoint) {
  return projectPoint(xScale.value(point.gdpChangePct), yScale.value(point.metricChangePct))
}

function updateTooltipPosition(event: MouseEvent) {
  const currentTarget = event.currentTarget as SVGGElement | null
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

function handleEnter(event: MouseEvent, point: OverviewPoint) {
  tooltipPoint.value = point
  updateTooltipPosition(event)
  emit('hover', point.isoCode)
}

function handleMove(event: MouseEvent) {
  if (!tooltipPoint.value) {
    return
  }

  updateTooltipPosition(event)
}

function handleLeave() {
  tooltipPoint.value = null
  emit('hover', null)
}

function zoomAround(anchorX: number, anchorY: number, factor: number) {
  const previous = currentTransform.value
  const nextScale = Math.min(maxZoom, Math.max(minZoom, previous.k * factor))
  const ratio = nextScale / previous.k

  currentTransform.value = clampTransform({
    k: nextScale,
    x: anchorX - (anchorX - previous.x) * ratio,
    y: anchorY - (anchorY - previous.y) * ratio,
  })
}

function zoomBy(factor: number) {
  zoomAround(innerWidth / 2, innerHeight / 2, factor)
}

function resetZoom() {
  currentTransform.value = { x: 0, y: 0, k: 1 }
}

function clampToPlot(value: number, limit: number) {
  return Math.max(0, Math.min(value, limit))
}

function toPlotCoordinates(clientX: number, clientY: number) {
  const svg = svgRef.value
  if (!svg) {
    return null
  }

  const rect = svg.getBoundingClientRect()
  const x = clampToPlot(clientX - rect.left - margin.left, innerWidth)
  const y = clampToPlot(clientY - rect.top - margin.top, innerHeight)
  return { x, y }
}

function handleWheel(event: WheelEvent) {
  const coordinates = toPlotCoordinates(event.clientX, event.clientY)
  if (!coordinates) {
    return
  }

  event.preventDefault()
  const factor = event.deltaY < 0 ? 1.14 : 1 / 1.14
  zoomAround(coordinates.x, coordinates.y, factor)
}

function startBrush(event: MouseEvent) {
  if (event.button !== 0) {
    return
  }

  const coordinates = toPlotCoordinates(event.clientX, event.clientY)
  if (!coordinates) {
    return
  }

  event.preventDefault()
  tooltipPoint.value = null
  emit('hover', null)
  brushRect.value = {
    startX: coordinates.x,
    startY: coordinates.y,
    currentX: coordinates.x,
    currentY: coordinates.y,
  }

  window.addEventListener('mousemove', updateBrush)
  window.addEventListener('mouseup', finishBrush)
}

function updateBrush(event: MouseEvent) {
  if (!brushRect.value) {
    return
  }

  const coordinates = toPlotCoordinates(event.clientX, event.clientY)
  if (!coordinates) {
    return
  }

  brushRect.value = {
    ...brushRect.value,
    currentX: coordinates.x,
    currentY: coordinates.y,
  }
}

function finishBrush() {
  const bounds = brushBounds.value

  if (bounds && bounds.width >= 4 && bounds.height >= 4) {
    const matched = sortedPoints.value
      .filter((point) => {
        const position = pointPosition(point)
        return (
          position.x >= bounds.x &&
          position.x <= bounds.x + bounds.width &&
          position.y >= bounds.y &&
          position.y <= bounds.y + bounds.height
        )
      })
      .map((point) => point.isoCode)

    brushedCountryCount.value = matched.length

    if (matched.length) {
      emit('boxSelect', matched)
    }
  } else {
    brushedCountryCount.value = 0
  }

  brushRect.value = null
  window.removeEventListener('mousemove', updateBrush)
  window.removeEventListener('mouseup', finishBrush)
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', updateBrush)
  window.removeEventListener('mouseup', finishBrush)
})
</script>

<template>
  <div class="chart-card chart-card--scatter">
    <div class="panel-heading panel-heading--stack">
      <div>
        <p class="eyebrow">{{ copy.eyebrow }}</p>
        <h2>{{ copy.title }}</h2>
      </div>
      <p class="panel-copy panel-copy--wide">{{ copy.description }}</p>
    </div>

    <div v-if="!points.length" class="empty-state">
      {{ copy.empty }}
    </div>

    <template v-else>
      <div class="scatter-toolbar">
        <div class="scatter-toolbar__group">
          <span class="scatter-zoom-badge">{{ zoomPercent }}%</span>
          <button type="button" class="scatter-tool-button" @click="zoomBy(1 / 1.25)">{{ copy.zoomOut }}</button>
          <button type="button" class="scatter-tool-button" @click="zoomBy(1.25)">{{ copy.zoomIn }}</button>
          <button type="button" class="scatter-tool-button" @click="resetZoom">{{ copy.zoomReset }}</button>
        </div>
      </div>

      <p class="scatter-interaction-hint">
        {{ copy.interactionHint }}
        <template v-if="brushedCountryCount > 0">
          {{ copy.selectionCount }}: <strong>{{ brushedCountryCount }}</strong>
        </template>
      </p>

      <svg
        ref="svgRef"
        :viewBox="`0 0 ${width} ${height}`"
        class="scatter-svg"
        role="img"
        @wheel.prevent="handleWheel"
      >
        <defs>
          <clipPath :id="plotClipId">
            <rect :x="0" :y="0" :width="innerWidth" :height="innerHeight" />
          </clipPath>
        </defs>

        <g :transform="`translate(${margin.left}, ${margin.top})`">
          <rect class="scatter-plot-bg" :x="0" :y="0" :width="innerWidth" :height="innerHeight" />

          <line class="axis-line" :x1="0" :x2="innerWidth" :y1="innerHeight" :y2="innerHeight" />
          <line class="axis-line" :x1="0" :x2="0" :y1="0" :y2="innerHeight" />

          <g :clip-path="`url(#${plotClipId})`">
            <g :transform="plotTransform">
              <rect class="quadrant quadrant--up-left" :x="0" :y="0" :width="zeroX" :height="zeroY" />
              <rect
                class="quadrant quadrant--up-right"
                :x="zeroX"
                :y="0"
                :width="innerWidth - zeroX"
                :height="zeroY"
              />
              <rect
                class="quadrant quadrant--down-left"
                :x="0"
                :y="zeroY"
                :width="zeroX"
                :height="innerHeight - zeroY"
              />
              <rect
                class="quadrant quadrant--decoupled"
                :x="zeroX"
                :y="zeroY"
                :width="innerWidth - zeroX"
                :height="innerHeight - zeroY"
              />

              <line class="axis-line axis-line--cross" :x1="0" :x2="innerWidth" :y1="zeroY" :y2="zeroY" />
              <line class="axis-line axis-line--cross" :x1="zeroX" :x2="zeroX" :y1="0" :y2="innerHeight" />
            </g>
          </g>

          <rect
            class="scatter-brush-surface"
            :x="0"
            :y="0"
            :width="innerWidth"
            :height="innerHeight"
            @mousedown="startBrush"
          />

          <g :clip-path="`url(#${plotClipId})`">
            <g :transform="plotTransform">
              <g
                v-for="point in sortedPoints"
                :key="point.isoCode"
                :transform="`translate(${xScale(point.gdpChangePct)}, ${yScale(point.metricChangePct)})`"
                @mouseenter="handleEnter($event, point)"
                @mousemove="handleMove($event)"
                @mouseleave="handleLeave"
                @click.stop="emit('select', point.isoCode)"
              >
                <circle :class="pointClass(point)" :r="pointRadius(point)">
                  <title>
                    {{ point.country }} | {{ copy.axisX }} {{ formatSignedPercent(point.gdpChangePct, 1, locale) }} |
                    {{ metricLabel }} {{ formatSignedPercent(point.metricChangePct, 1, locale) }} |
                    {{ copy.tooltipPopulation }} {{ formatCompactNumber(point.endRecord.population, 1, locale) }}
                  </title>
                </circle>
              </g>

              <g v-for="annotation in plottedAnnotations" :key="annotation.isoCode" class="annotation-layer">
                <line
                  class="annotation-line"
                  :x1="xScale(annotation.point.gdpChangePct)"
                  :y1="yScale(annotation.point.metricChangePct)"
                  :x2="xScale(annotation.point.gdpChangePct) + annotation.dx"
                  :y2="yScale(annotation.point.metricChangePct) + annotation.dy"
                />
                <g
                  class="annotation-card"
                  :transform="`translate(${xScale(annotation.point.gdpChangePct) + annotation.dx}, ${yScale(annotation.point.metricChangePct) + annotation.dy})`"
                >
                  <rect class="annotation-card__bg" x="0" y="-38" rx="12" ry="12" width="198" height="56" />
                  <text class="annotation-card__title" x="12" y="-18">{{ annotation.title }}</text>
                  <text class="annotation-card__body" x="12" y="2">{{ annotation.body }}</text>
                </g>
              </g>
            </g>
          </g>

          <g
            v-for="point in sortedPoints"
            :key="`${point.isoCode}-label`"
            :transform="`translate(${pointPosition(point).x}, ${pointPosition(point).y})`"
          >
            <text
              v-if="selectedSet.has(point.isoCode) || props.hoveredCountry === point.isoCode"
              class="point-label"
              x="10"
              y="-10"
            >
              {{ point.country }}
            </text>
          </g>

          <rect
            v-if="brushBounds"
            class="scatter-brush"
            :x="brushBounds.x"
            :y="brushBounds.y"
            :width="brushBounds.width"
            :height="brushBounds.height"
          />

          <text class="quadrant-label" x="12" y="22">{{ copy.q1 }}</text>
          <text class="quadrant-label" :x="zeroX + 12" y="22">{{ copy.q2 }}</text>
          <text class="quadrant-label" x="12" :y="innerHeight - 12">{{ copy.q3 }}</text>
          <text class="quadrant-label quadrant-label--focus" :x="zeroX + 12" :y="innerHeight - 12">
            {{ copy.q4 }}
          </text>

          <text class="axis-title" :x="innerWidth / 2" :y="innerHeight + 44">
            {{ copy.axisX }} ({{ startYear }} → {{ endYear }})
          </text>
          <text class="axis-title axis-title--y" :x="-innerHeight / 2" :y="-54">
            {{ metricLabel }} ({{ startYear }} → {{ endYear }})
          </text>
        </g>
      </svg>

      <div class="scatter-footer">
        <div class="scatter-legend">
          <span class="scatter-legend__title">{{ copy.legendTitle }}</span>
          <span
            v-for="item in legendItems"
            :key="item.key"
            class="scatter-legend__item"
          >
            <span :class="['scatter-legend__dot', `scatter-legend__dot--${item.key}`]"></span>
            {{ item.label }}
          </span>
        </div>
        <p class="scatter-note">{{ copy.legendPopulation }}</p>
      </div>
    </template>

    <div v-if="tooltipPoint" class="chart-tooltip chart-tooltip--wide" :style="tooltipStyle">
      <div class="chart-tooltip__top">
        <strong>{{ tooltipPoint.country }}</strong>
        <span>{{ statusLabel(tooltipPoint) }}</span>
      </div>
      <p class="chart-tooltip__range">{{ copy.tooltipRange }}: {{ startYear }} → {{ endYear }}</p>
      <div class="chart-tooltip__grid">
        <div>
          <span>{{ copy.tooltipGdp }}</span>
          <strong>{{ formatSignedPercent(tooltipPoint.gdpChangePct, 1, locale) }}</strong>
        </div>
        <div>
          <span>{{ copy.tooltipMetric }}</span>
          <strong>{{ formatSignedPercent(tooltipPoint.metricChangePct, 1, locale) }}</strong>
        </div>
        <div>
          <span>{{ copy.tooltipRenewables }}</span>
          <strong>{{ formatSignedPoints(tooltipPoint.renewablesChangePts, 1, locale) }}</strong>
        </div>
        <div>
          <span>{{ copy.tooltipPopulation }}</span>
          <strong>{{ formatCompactNumber(tooltipPoint.endRecord.population, 1, locale) }}</strong>
        </div>
      </div>
      <div class="chart-tooltip__comparison">
        <div>
          <span>{{ copy.tooltipGdpValues }}</span>
          <strong>
            {{ formatNumber(tooltipPoint.startRecord.gdpPerCapita, 1, locale) }} →
            {{ formatNumber(tooltipPoint.endRecord.gdpPerCapita, 1, locale) }}
          </strong>
        </div>
        <div>
          <span>{{ copy.tooltipMetricValues }}</span>
          <strong>
            {{ formatNumber(tooltipPoint.metricStart, 2, locale) }} →
            {{ formatNumber(tooltipPoint.metricEnd, 2, locale) }}
          </strong>
        </div>
        <div>
          <span>{{ copy.tooltipRenewablesValues }}</span>
          <strong>
            {{ formatNumber(tooltipPoint.startRecord.renewablesShareEnergy, 1, locale) }}% →
            {{ formatNumber(tooltipPoint.endRecord.renewablesShareEnergy, 1, locale) }}%
          </strong>
        </div>
      </div>
    </div>
  </div>
</template>
