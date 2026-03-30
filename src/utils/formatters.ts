import type { Locale } from '../types'

function localeCode(locale: Locale = 'en') {
  return locale === 'zh' ? 'zh-CN' : 'en-US'
}

export function formatCompactNumber(
  value: number | null,
  maximumFractionDigits = 1,
  locale: Locale = 'en',
) {
  if (value === null || Number.isNaN(value)) {
    return 'N/A'
  }

  return new Intl.NumberFormat(localeCode(locale), {
    notation: 'compact',
    maximumFractionDigits,
  }).format(value)
}

export function formatNumber(value: number | null, maximumFractionDigits = 1, locale: Locale = 'en') {
  if (value === null || Number.isNaN(value)) {
    return 'N/A'
  }

  return new Intl.NumberFormat(localeCode(locale), {
    maximumFractionDigits,
  }).format(value)
}

export function formatSignedPercent(
  value: number | null,
  maximumFractionDigits = 1,
  locale: Locale = 'en',
) {
  if (value === null || Number.isNaN(value)) {
    return 'N/A'
  }

  const sign = value > 0 ? '+' : ''
  return `${sign}${formatNumber(value, maximumFractionDigits, locale)}%`
}

export function formatShare(value: number | null, maximumFractionDigits = 1, locale: Locale = 'en') {
  if (value === null || Number.isNaN(value)) {
    return 'N/A'
  }

  return `${formatNumber(value, maximumFractionDigits, locale)}%`
}

export function formatSignedPoints(
  value: number | null,
  maximumFractionDigits = 1,
  locale: Locale = 'en',
) {
  if (value === null || Number.isNaN(value)) {
    return 'N/A'
  }

  const sign = value > 0 ? '+' : ''
  const suffix = locale === 'zh' ? ' 个百分点' : ' pts'
  return `${sign}${formatNumber(value, maximumFractionDigits, locale)}${suffix}`
}
