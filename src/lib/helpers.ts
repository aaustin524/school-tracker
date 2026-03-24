import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  startOfWeek,
  endOfWeek,
  format,
  parseISO,
  isWithinInterval,
  isBefore,
  isAfter,
  startOfDay,
  addDays,
  subDays,
} from 'date-fns'
import type { Assignment } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getWeekRange(date = new Date()) {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(date, { weekStartsOn: 1 }),
  }
}

export function isThisWeek(dateStr: string) {
  const { start, end } = getWeekRange()
  return isWithinInterval(parseISO(dateStr), { start, end })
}

export function isOverdue(dateStr: string) {
  const today = startOfDay(new Date())
  return isBefore(parseISO(dateStr), today)
}

export function isUpcoming(dateStr: string) {
  const { end } = getWeekRange()
  return isAfter(parseISO(dateStr), end)
}

export function formatDisplayDate(dateStr: string) {
  return format(parseISO(dateStr), 'EEE, MMM d')
}

export function formatShortDate(dateStr: string) {
  return format(parseISO(dateStr), 'MMM d')
}

export function getMondayOfCurrentWeek(): string {
  const { start } = getWeekRange()
  return format(start, 'yyyy-MM-dd')
}

export const SUBJECTS = [
  'General',
  'Math',
  'Reading',
  'Science',
  'Writing',
  'History',
  'Art',
  'Music',
  'Spanish',
]

export const ASSIGNMENT_TYPES = [
  'homework',
  'test',
  'project',
  'quiz',
  'reading',
  'other',
] as const

export const SUBJECT_COLORS: Record<string, string> = {
  'Math':    'bg-teal-100 text-teal-700',
  'Reading': 'bg-amber-100 text-amber-700',
  'Science': 'bg-emerald-100 text-emerald-700',
  'Writing': 'bg-indigo-100 text-indigo-700',
  'History': 'bg-orange-100 text-orange-700',
  'Art':     'bg-pink-100 text-pink-700',
  'Music':   'bg-violet-100 text-violet-700',
  'Spanish': 'bg-yellow-100 text-yellow-700',
  'General': 'bg-gray-100 text-gray-600',
}

export function getSubjectColor(subject: string): string {
  return SUBJECT_COLORS[subject] ?? SUBJECT_COLORS['General']
}

export const THEME_COLORS: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  coral: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-800',
    text: 'text-orange-700',
  },
  sky: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    badge: 'bg-sky-100 text-sky-800',
    text: 'text-sky-700',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-800',
    text: 'text-green-700',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-800',
    text: 'text-purple-700',
  },
}

export function calculateStreak(assignments: Assignment[]): number {
  let streak = 0
  for (let i = 1; i <= 365; i++) {
    const dateStr = format(subDays(new Date(), i), 'yyyy-MM-dd')
    const dayItems = assignments.filter((a) => a.due_date === dateStr)
    if (dayItems.length === 0) continue // free day — doesn't break streak
    if (dayItems.every((a) => a.completed)) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

export function getDayLabel(dateStr: string): string {
  return format(parseISO(dateStr), 'EEEE') // "Monday", "Tuesday", etc.
}

export function formatRelativeDate(dateStr: string): string {
  const today = format(new Date(), 'yyyy-MM-dd')
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  if (dateStr === today) return 'Today'
  if (dateStr === tomorrow) return 'Tomorrow'
  const date = parseISO(dateStr)
  const { start, end } = getWeekRange()
  if (isWithinInterval(date, { start, end })) return format(date, 'EEE') // "Mon", "Tue"
  return format(date, 'MMM d')
}
