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
} from 'date-fns'

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

export function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

export function getDayLabel(dateStr: string): string {
  return format(parseISO(dateStr), 'EEEE') // "Monday", "Tuesday", etc.
}
