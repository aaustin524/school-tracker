'use client'

import { useState, useEffect, useCallback } from 'react'
import { notFound } from 'next/navigation'
import type { Assignment, Child } from '@/types'
import { getSupabase } from '@/lib/supabase'
import { AssignmentCard } from '@/components/AssignmentCard'
import { AddAssignmentDialog } from '@/components/AddAssignmentDialog'
import { nameToSlug, THEME_COLORS, formatShortDate } from '@/lib/helpers'

interface ChildPageProps {
  params: { childSlug: string }
}

export default function ChildPage({ params }: ChildPageProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [child, setChild] = useState<Child | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active')

  const loadData = useCallback(async () => {
    const childrenRes = await getSupabase().from('children').select('*').order('name')
    const allChildren: Child[] = childrenRes.data ?? []
    setChildren(allChildren)

    const matched = allChildren.find(
      (c) => nameToSlug(c.name) === params.childSlug
    )

    if (!matched) {
      setLoading(false)
      return
    }

    setChild(matched)

    const res = await fetch(`/api/assignments?child_id=${matched.id}`)
    setAssignments(await res.json())
    setLoading(false)
  }, [params.childSlug])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleToggleComplete(id: string, completed: boolean) {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, completed } : a)))
    await fetch(`/api/assignments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    })
  }

  async function handleDelete(id: string) {
    setAssignments((prev) => prev.filter((a) => a.id !== id))
    await fetch(`/api/assignments/${id}`, { method: 'DELETE' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    )
  }

  if (!child) {
    return notFound()
  }

  const theme = THEME_COLORS[child.theme] ?? THEME_COLORS.coral

  const filtered = assignments.filter((a) => {
    if (filter === 'active') return !a.completed
    if (filter === 'completed') return a.completed
    return true
  })

  // Group by due date
  const grouped = filtered.reduce<Record<string, Assignment[]>>((acc, a) => {
    if (!acc[a.due_date]) acc[a.due_date] = []
    acc[a.due_date].push(a)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Dashboard
          </a>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{child.name}</h1>
          <span className={`text-sm font-medium ${theme.text}`}>{child.grade}</span>
        </div>
        <AddAssignmentDialog childOptions={children} onAdded={loadData} />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1 w-fit">
        {(['active', 'all', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {sortedDates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-500">
            {filter === 'active' ? 'No active assignments!' : 'No assignments found.'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Upload a teacher PDF or add one manually.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <h2 className="mb-2 text-sm font-semibold text-gray-500">
                {formatShortDate(date)}
              </h2>
              <div className="space-y-2">
                {grouped[date].map((a) => (
                  <AssignmentCard
                    key={a.id}
                    assignment={a}
                    child={child}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
