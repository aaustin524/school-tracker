'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Assignment, Child } from '@/types'
import { getSupabase } from '@/lib/supabase'
import { WeeklyView } from '@/components/WeeklyView'
import { AddAssignmentDialog } from '@/components/AddAssignmentDialog'
import { nameToSlug } from '@/lib/helpers'

export default function DashboardPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const [assignmentsRes, childrenRes] = await Promise.all([
      fetch('/api/assignments'),
      getSupabase().from('children').select('*').order('name'),
    ])

    const assignmentsData = await assignmentsRes.json()
    setAssignments(assignmentsData)
    setChildren(childrenRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleToggleComplete(id: string, completed: boolean) {
    // Optimistic update
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, completed } : a))
    )
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
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-gray-500">Loading assignments...</p>
        </div>
      </div>
    )
  }

  const completedAssignments = assignments.filter((a) => a.completed)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="mt-1 flex gap-4">
            {children.map((c) => (
              <a
                key={c.id}
                href={`/${nameToSlug(c.name)}`}
                className="text-sm text-blue-600 hover:underline"
              >
                {c.name.split(' ')[0]} →
              </a>
            ))}
          </div>
        </div>
        <AddAssignmentDialog childOptions={children} onAdded={loadData} />
      </div>

      <WeeklyView
        assignments={assignments}
        childList={children}
        onToggleComplete={handleToggleComplete}
        onDelete={handleDelete}
      />

      {completedAssignments.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Completed ({completedAssignments.length})
          </h2>
          <div className="space-y-2">
            {completedAssignments.map((a) => {
              const child = children.find((c) => c.id === a.child_id)
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 opacity-60"
                >
                  <span className="text-green-500">✓</span>
                  <span className="text-sm line-through text-gray-500">{a.title}</span>
                  {child && (
                    <span className="text-xs text-gray-400">{child.name.split(' ')[0]}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
