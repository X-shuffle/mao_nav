import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterCategories, getSiteHost } from '../src/apis/navigationSearch.js'

const categories = [
  { id: 'ai', name: 'AI', sites: [
    { id: 'claude', name: 'Claude', description: 'AI 对话助手', url: 'https://claude.ai/chat' },
    { id: 'copilot', name: 'GitHub Copilot', description: 'AI 代码助手', url: 'https://github.com/features/copilot' },
  ] },
  { id: 'dev', sites: [{ id: 'git', name: 'GitHub', url: 'https://github.com' }] },
  { id: 'empty' },
]

test('empty queries retain all categories including empty ones', () => {
  assert.equal(filterCategories(categories, '  '), categories)
})

test('matches names without case sensitivity and omits unmatched categories', () => {
  const result = filterCategories(categories, '  CLAUDE  ')
  assert.deepEqual(result.map(category => category.id), ['ai'])
  assert.deepEqual(result[0].sites.map(site => site.id), ['claude'])
})

test('searches Chinese descriptions and URLs, including missing descriptions', () => {
  assert.equal(filterCategories(categories, '对话')[0].sites[0].id, 'claude')
  assert.deepEqual(filterCategories(categories, 'github.com').flatMap(category => category.sites.map(site => site.id)), ['copilot', 'git'])
})

test('multiple words must all match the same site, without modifying source data', () => {
  const before = JSON.stringify(categories)
  assert.equal(filterCategories(categories, 'github 代码')[0].sites[0].id, 'copilot')
  assert.deepEqual(filterCategories(categories, 'claude 代码'), [])
  assert.equal(JSON.stringify(categories), before)
})

test('extracts clean hostnames and safely handles invalid or absent URLs', () => {
  assert.equal(getSiteHost('https://www.github.com/features?q=test'), 'github.com')
  assert.equal(getSiteHost('http://localhost:8080/path'), 'localhost')
  assert.equal(getSiteHost(undefined), '')
  assert.equal(getSiteHost('invalid'), 'invalid')
})
