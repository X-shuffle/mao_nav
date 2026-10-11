import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PREFERENCES_KEY, readPreferences, savePreferences } from '../src/apis/navigationPreferences.js'

test('missing, malformed and blocked storage produce safe defaults', () => {
  for (const storage of [
    { getItem: () => null },
    { getItem: () => 'invalid json' },
    { getItem: () => { throw new Error('Blocked') } },
  ]) assert.deepEqual(readPreferences(storage), { favoriteUrls: [], viewMode: 'cards' })
})

test('deduplicates favorites and ignores invalid URLs and view modes', () => {
  const result = readPreferences({ getItem: () => JSON.stringify({ favoriteUrls: ['https://example.com', 'https://example.com', null, 'javascript:alert(1)', 42], viewMode: 'invalid' }) })
  assert.deepEqual(result, { favoriteUrls: ['https://example.com'], viewMode: 'cards' })
})

test('favorites and list preference round-trip through storage', () => {
  const values = new Map()
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }
  const preferences = { favoriteUrls: ['https://claude.ai/', 'https://github.com/'], viewMode: 'list' }
  assert.equal(savePreferences(storage, preferences), true)
  assert.ok(values.has(PREFERENCES_KEY))
  assert.deepEqual(readPreferences(storage), preferences)
})

test('storage quota errors do not crash the UI', () => {
  assert.equal(savePreferences({ setItem: () => { throw new Error('Quota exceeded') } }, { favoriteUrls: [], viewMode: 'cards' }), false)
})
