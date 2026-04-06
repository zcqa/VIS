<script setup lang="ts">
import { computed } from 'vue'
import type { Locale } from '../types'

interface Heading {
  level: number
  text: string
  id: string
}

const props = defineProps<{
  markdown: string
  locale: Locale
}>()

const copy = computed(() =>
  props.locale === 'zh'
    ? {
        eyebrow: '项目说明',
        title: '设计说明与实现过程',
        body: '这一部分与可视化作品同页展示，方便老师在浏览作品时直接看到问题定义、设计逻辑、数据来源和实现方式。',
        outline: '目录导航',
      }
    : {
        eyebrow: 'Project Write-up',
        title: 'Design Rationale and Build Notes',
        body: 'This section lives on the same page as the visualization so viewers can read the problem framing, design logic, data sources, and implementation notes in one flow.',
        outline: 'Outline',
      },
)

const parsedWriteup = computed(() => parseMarkdown(props.markdown))
const sectionHeadings = computed(() => parsedWriteup.value.headings.filter((heading) => heading.level === 2))

function parseMarkdown(markdown: string) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const htmlParts: string[] = []
  const headings: Heading[] = []
  const slugCounts = new Map<string, number>()
  let paragraphLines: string[] = []
  let listItems: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let inCodeBlock = false
  let codeLanguage = ''
  let codeLines: string[] = []

  const flushParagraph = () => {
    if (!paragraphLines.length) {
      return
    }

    htmlParts.push(`<p>${formatInline(paragraphLines.join(' '))}</p>`)
    paragraphLines = []
  }

  const flushList = () => {
    if (!listType || !listItems.length) {
      return
    }

    const items = listItems.map((item) => `<li>${formatInline(item)}</li>`).join('')
    htmlParts.push(`<${listType}>${items}</${listType}>`)
    listItems = []
    listType = null
  }

  const flushCode = () => {
    if (!inCodeBlock) {
      return
    }

    const languageClass = codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : ''
    htmlParts.push(`<pre><code${languageClass}>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
    inCodeBlock = false
    codeLanguage = ''
    codeLines = []
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/u, '')
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      flushParagraph()
      flushList()

      if (inCodeBlock) {
        flushCode()
      } else {
        inCodeBlock = true
        codeLanguage = trimmed.slice(3).trim()
        codeLines = []
      }

      continue
    }

    if (inCodeBlock) {
      codeLines.push(rawLine)
      continue
    }

    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/u)
    if (headingMatch) {
      flushParagraph()
      flushList()
      const level = headingMatch[1].length
      const text = headingMatch[2].trim()
      const id = uniqueSlug(slugify(text), slugCounts)

      headings.push({ level, text, id })
      htmlParts.push(`<h${level} id="${id}">${formatInline(text)}</h${level}>`)
      continue
    }

    const unorderedMatch = trimmed.match(/^-\s+(.*)$/u)
    if (unorderedMatch) {
      flushParagraph()
      if (listType && listType !== 'ul') {
        flushList()
      }
      listType = 'ul'
      listItems.push(unorderedMatch[1].trim())
      continue
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/u)
    if (orderedMatch) {
      flushParagraph()
      if (listType && listType !== 'ol') {
        flushList()
      }
      listType = 'ol'
      listItems.push(orderedMatch[1].trim())
      continue
    }

    flushList()
    paragraphLines.push(trimmed)
  }

  flushParagraph()
  flushList()
  flushCode()

  return {
    html: htmlParts.join('\n'),
    headings,
  }
}

function formatInline(text: string) {
  let html = escapeHtml(text)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  return html
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function slugify(text: string) {
  const base = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  return base || 'section'
}

function uniqueSlug(base: string, slugCounts: Map<string, number>) {
  const count = slugCounts.get(base) ?? 0
  slugCounts.set(base, count + 1)
  return count === 0 ? base : `${base}-${count + 1}`
}
</script>

<template>
  <article class="chart-card writeup-card">
    <div class="panel-heading panel-heading--stack">
      <div>
        <p class="eyebrow">{{ copy.eyebrow }}</p>
        <h2>{{ copy.title }}</h2>
      </div>
      <p class="panel-copy panel-copy--wide">
        {{ copy.body }}
      </p>
    </div>

    <div class="writeup-layout">
      <nav class="writeup-nav" aria-label="Write-up sections">
        <p class="writeup-nav__title">{{ copy.outline }}</p>
        <a
          v-for="heading in sectionHeadings"
          :key="heading.id"
          class="writeup-nav__link"
          :href="`#${heading.id}`"
        >
          {{ heading.text }}
        </a>
      </nav>

      <section class="writeup-prose" v-html="parsedWriteup.html"></section>
    </div>
  </article>
</template>
