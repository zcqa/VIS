<script setup lang="ts">
import { computed } from 'vue'
import type { CountryOption, Locale, OverviewPoint } from '../types'
import {
  formatCompactNumber,
  formatShare,
  formatSignedPercent,
  formatSignedPoints,
} from '../utils/formatters'

const props = defineProps<{
  point: OverviewPoint | null
  selectedCountries: CountryOption[]
  insights: string[]
  metricLabel: string
  storyLabel: string | null
  locale: Locale
  regionLabel: string | null
  incomeLabel: string | null
}>()

const copy = computed(() =>
  props.locale === 'zh'
    ? {
        eyebrow: '洞察面板',
        title: '当前国家洞察',
        empty:
          '还没有选中国家。先在总览散点图中点击一个国家，或直接使用上方故事模式按钮。',
        compareTitle: '当前比较组',
        noCompare: '暂无',
        autoInsight: '自动洞察',
        storyMode: '故事模式',
        startMix: '起点能源结构',
        endMix: '终点能源结构',
        renewablesWord: '可再生能源',
        statGdp: '人均 GDP',
        statRenewables: '可再生能源',
        statPopulation: '人口',
      }
    : {
        eyebrow: 'Insight Panel',
        title: 'Current country insight',
        empty:
          'No country is selected yet. Click a country in the overview scatter or use one of the story presets above.',
        compareTitle: 'Current compare set',
        noCompare: 'None',
        autoInsight: 'Auto insights',
        storyMode: 'Story mode',
        startMix: 'Start energy mix',
        endMix: 'End energy mix',
        renewablesWord: 'renewables',
        statGdp: 'GDP / cap',
        statRenewables: 'Renewables',
        statPopulation: 'Population',
      },
)

function statusText(status: OverviewPoint['status']) {
  if (props.locale === 'zh') {
    if (status === 'decoupled') {
      return '长期脱钩样本'
    }

    if (status === 'growth-with-emissions') {
      return '增长伴随排放上升'
    }

    if (status === 'low-growth-lower-emissions') {
      return '低增长且排放下降'
    }

    return '低增长但排放上升'
  }

  if (status === 'decoupled') {
    return 'Long-run decoupling'
  }

  if (status === 'growth-with-emissions') {
    return 'Growth with emissions'
  }

  if (status === 'low-growth-lower-emissions') {
    return 'Low growth and lower emissions'
  }

  return 'Low growth with higher emissions'
}

function statusDescription(point: OverviewPoint | null) {
  if (!point) {
    return props.locale === 'zh'
      ? '从总览散点图中选中国家后，这里会生成一段简短解释，帮助你快速讲清这个国家的路径。'
      : 'Once a country is selected in the overview scatter, this panel generates a short narrative to help explain its path.'
  }

  if (props.locale === 'zh') {
    if (point.status === 'decoupled') {
      return `${point.country} 在所选时间段内实现了明显脱钩：经济继续增长，但排放指标下降。`
    }

    if (point.status === 'growth-with-emissions') {
      return `${point.country} 仍处于增长伴随排放上升的象限，是后续重点对照样本。`
    }

    return `${point.country} 没有表现出典型的“增长但减排”路径，更适合作为边界案例观察。`
  }

  if (point.status === 'decoupled') {
    return `${point.country} shows a clear decoupling pattern in the selected years: the economy keeps growing while the emissions metric falls.`
  }

  if (point.status === 'growth-with-emissions') {
    return `${point.country} still sits in the growth-with-rising-emissions quadrant, making it a useful comparison case.`
  }

  return `${point.country} does not show a typical grow-while-cutting-emissions path, so it works better as a boundary case.`
}
</script>

<template>
  <div class="chart-card insight-card">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">{{ copy.eyebrow }}</p>
        <h2>{{ copy.title }}</h2>
      </div>
      <span v-if="point" :class="['status-pill', `status-pill--${point.status}`]">
        {{ statusText(point.status) }}
      </span>
    </div>

    <div v-if="point" class="insight-body">
      <div class="insight-header">
        <div>
          <h3>{{ point.country }}</h3>
          <p>{{ regionLabel ?? point.region }} · {{ incomeLabel ?? point.incomeLevel }}</p>
        </div>
        <div class="insight-country-code">{{ point.isoCode }}</div>
      </div>

      <div class="stat-grid">
        <div class="stat-box">
          <span class="stat-label">{{ copy.statGdp }}</span>
          <strong>{{ formatSignedPercent(point.gdpChangePct, 1, locale) }}</strong>
        </div>
        <div class="stat-box">
          <span class="stat-label">{{ metricLabel }}</span>
          <strong>{{ formatSignedPercent(point.metricChangePct, 1, locale) }}</strong>
        </div>
        <div class="stat-box">
          <span class="stat-label">{{ copy.statRenewables }}</span>
          <strong>{{ formatSignedPoints(point.renewablesChangePts, 1, locale) }}</strong>
        </div>
        <div class="stat-box">
          <span class="stat-label">{{ copy.statPopulation }}</span>
          <strong>{{ formatCompactNumber(point.endRecord.population, 1, locale) }}</strong>
        </div>
      </div>

      <p class="insight-copy">{{ statusDescription(point) }}</p>

      <div v-if="storyLabel" class="insight-story">
        <span class="stat-label">{{ copy.storyMode }}</span>
        <strong>{{ storyLabel }}</strong>
      </div>

      <div class="energy-callouts">
        <div>
          <span class="stat-label">{{ copy.startMix }}</span>
          <strong>{{ formatShare(point.startRecord.renewablesShareEnergy, 1, locale) }} {{ copy.renewablesWord }}</strong>
        </div>
        <div>
          <span class="stat-label">{{ copy.endMix }}</span>
          <strong>{{ formatShare(point.endRecord.renewablesShareEnergy, 1, locale) }} {{ copy.renewablesWord }}</strong>
        </div>
      </div>

      <div v-if="insights.length" class="insight-list">
        <p class="selection-title">{{ copy.autoInsight }}</p>
        <ul>
          <li v-for="insight in insights" :key="insight">{{ insight }}</li>
        </ul>
      </div>
    </div>

    <div v-else class="empty-state">
      {{ copy.empty }}
    </div>

    <div class="selection-strip">
      <p class="selection-title">{{ copy.compareTitle }}</p>
      <div class="selection-chips">
        <span v-for="country in selectedCountries" :key="country.isoCode" class="country-chip">
          {{ country.country }}
        </span>
        <span v-if="!selectedCountries.length" class="country-chip country-chip--muted">{{ copy.noCompare }}</span>
      </div>
    </div>
  </div>
</template>
