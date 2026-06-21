import { describe, it, expect } from 'vitest'
import { buildSchedule } from './schedule.js'

describe('buildSchedule', () => {
  it('always returns exactly 28 days', () => {
    expect(buildSchedule(false)).toHaveLength(28)
    expect(buildSchedule(true)).toHaveLength(28)
  })

  it('numbers days 1 through 28 in order', () => {
    const sched = buildSchedule(false)
    expect(sched.map((d) => d.day)).toEqual(Array.from({ length: 28 }, (_, i) => i + 1))
  })

  it('rest days fall on Thursday and Sunday every week', () => {
    const sched = buildSchedule(false)
    const restDayNames = sched.filter((d) => d.isRest).map((d) => d.dayName)
    expect(new Set(restDayNames)).toEqual(new Set(['Thursday', 'Sunday']))
    expect(restDayNames).toHaveLength(8) // 4 weeks x 2 rest days
  })

  it('weeks 1-2 are Foundation phase, weeks 3-4 are Intensity', () => {
    const sched = buildSchedule(false)
    const week1to2 = sched.filter((d) => d.week <= 2)
    const week3to4 = sched.filter((d) => d.week >= 3)
    expect(week1to2.every((d) => d.phase === 'Foundation')).toBe(true)
    expect(week3to4.every((d) => d.phase === 'Intensity')).toBe(true)
  })

  it('adult schedule never uses Teens-only labels', () => {
    const sched = buildSchedule(false)
    expect(sched.some((d) => d.type === 'Training' || d.type === 'Boss Mode')).toBe(false)
  })

  it('teens schedule uses Training (foundation) / Boss Mode (intensity) labels', () => {
    const sched = buildSchedule(true)
    const week1to2 = sched.filter((d) => d.week <= 2 && !d.isRest)
    const week3to4 = sched.filter((d) => d.week >= 3 && !d.isRest)
    expect(week1to2.every((d) => d.type === 'Training')).toBe(true)
    expect(week3to4.every((d) => d.type === 'Boss Mode')).toBe(true)
  })

  it('rest days have no assigned exercise IDs', () => {
    const sched = buildSchedule(false)
    expect(sched.filter((d) => d.isRest).every((d) => d.exIds.length === 0)).toBe(true)
  })

  it('is deterministic (same input -> identical output)', () => {
    expect(buildSchedule(false)).toEqual(buildSchedule(false))
  })

  it('topicId always matches Day N -> TN', () => {
    const sched = buildSchedule(false)
    expect(sched.every((d) => d.topicId === `T${d.day}`)).toBe(true)
  })
})
