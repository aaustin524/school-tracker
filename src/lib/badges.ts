import { format, startOfWeek, addDays } from 'date-fns'
import type { Assignment } from '@/types'
import { calculateStreak } from './helpers'

export interface Badge {
  id: string
  emoji: string
  name: string
  desc: string
}

export const ALL_BADGES: Badge[] = [
  { id: 'first_step',    emoji: '🌱', name: 'First Steps',    desc: 'Complete your first assignment' },
  { id: 'ten_done',      emoji: '📚', name: 'Bookworm',       desc: 'Complete 10 assignments' },
  { id: 'twenty_five',   emoji: '🎓', name: 'Scholar',        desc: 'Complete 25 assignments' },
  { id: 'fifty_done',    emoji: '🏆', name: 'Champion',       desc: 'Complete 50 assignments' },
  { id: 'streak_3',      emoji: '🔥', name: 'On Fire',        desc: '3-day streak' },
  { id: 'streak_5',      emoji: '⚡', name: 'Lightning',      desc: '5-day streak' },
  { id: 'streak_10',     emoji: '👑', name: 'Unstoppable',    desc: '10-day streak' },
  { id: 'perfect_week',  emoji: '🌟', name: 'Perfect Week',   desc: 'Complete every assignment in a full week' },
  { id: 'test_ace',      emoji: '🎯', name: 'Ace',            desc: 'Complete 5 tests or quizzes' },
  { id: 'reader',        emoji: '📖', name: 'Reader',         desc: 'Complete 5 reading assignments' },
  { id: 'math_whiz',     emoji: '🧮', name: 'Math Whiz',      desc: 'Complete 5 math assignments' },
  { id: 'high_scorer',   emoji: '💯', name: 'High Scorer',    desc: 'Record a score of 90 or above' },
]

function hasPerfectWeek(assignments: Assignment[]): boolean {
  const today = format(new Date(), 'yyyy-MM-dd')
  // Look at each past week and check if all assignments that week were completed
  for (let w = 1; w <= 52; w++) {
    const base = new Date()
    base.setDate(base.getDate() - w * 7)
    const monday = startOfWeek(base, { weekStartsOn: 1 })
    const mondayStr = format(monday, 'yyyy-MM-dd')
    const fridayStr = format(addDays(monday, 4), 'yyyy-MM-dd')
    if (fridayStr >= today) continue // skip current/future weeks
    const weekItems = assignments.filter((a) => a.due_date >= mondayStr && a.due_date <= fridayStr)
    if (weekItems.length > 0 && weekItems.every((a) => a.completed)) return true
  }
  return false
}

export function getEarnedBadgeIds(assignments: Assignment[]): Set<string> {
  const completed = assignments.filter((a) => a.completed)
  const streak = calculateStreak(assignments)
  const earned = new Set<string>()

  if (completed.length >= 1)  earned.add('first_step')
  if (completed.length >= 10) earned.add('ten_done')
  if (completed.length >= 25) earned.add('twenty_five')
  if (completed.length >= 50) earned.add('fifty_done')
  if (streak >= 3)  earned.add('streak_3')
  if (streak >= 5)  earned.add('streak_5')
  if (streak >= 10) earned.add('streak_10')
  if (hasPerfectWeek(assignments)) earned.add('perfect_week')
  if (completed.filter((a) => a.type === 'test' || a.type === 'quiz').length >= 5) earned.add('test_ace')
  if (completed.filter((a) => a.subject === 'Reading').length >= 5) earned.add('reader')
  if (completed.filter((a) => a.subject === 'Math').length >= 5)    earned.add('math_whiz')
  if (completed.some((a) => a.score != null && a.score >= 90))      earned.add('high_scorer')

  return earned
}
