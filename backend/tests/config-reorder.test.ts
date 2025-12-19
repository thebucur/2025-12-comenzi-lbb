import assert from 'node:assert/strict'
import test from 'node:test'

import { haveSameItems, itemsEqual } from '../src/controllers/config.controller'

test('itemsEqual compares strings and color objects', () => {
  assert.equal(itemsEqual('A', 'A'), true)
  assert.equal(itemsEqual('A', 'B'), false)
  assert.equal(itemsEqual({ name: 'RED', value: '#f00' }, { name: 'RED', value: '#f00' }), true)
  assert.equal(itemsEqual({ name: 'RED', value: '#f00' }, { name: 'RED', value: '#0f0' }), false)
  assert.equal(itemsEqual({ name: 'RED', value: '#f00' }, 'RED'), true)
  assert.equal(itemsEqual('RED', { name: 'RED', value: '#f00' }), true)
})

test('haveSameItems detects matching sets regardless of order', () => {
  const current = ['A', 'B', { name: 'C', value: '#ccc' }]
  const sameButReordered = [{ name: 'C', value: '#ccc' }, 'B', 'A']
  assert.equal(haveSameItems(current, sameButReordered), true)
})

test('haveSameItems detects missing or extra entries', () => {
  const current = ['A', 'B']
  const missing = ['A']
  const extra = ['A', 'B', 'C']
  assert.equal(haveSameItems(current, missing), false)
  assert.equal(haveSameItems(current, extra), false)
})



