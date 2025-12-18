import assert from 'node:assert/strict'
import test from 'node:test'

import { reorderList } from '../src/utils/reorder'

test('reorderList moves items without mutating original', () => {
  const items = ['A', 'B', 'C']
  const result = reorderList(items, 0, 2)

  assert.deepEqual(result, ['B', 'C', 'A'])
  assert.deepEqual(items, ['A', 'B', 'C'], 'original array should remain unchanged')
})

test('reorderList no-ops for out-of-range indexes', () => {
  const items = ['A', 'B']
  assert.deepEqual(reorderList(items, -1, 1), ['A', 'B'])
  assert.deepEqual(reorderList(items, 0, 5), ['A', 'B'])
})

