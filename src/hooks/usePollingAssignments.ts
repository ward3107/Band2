// hooks/usePollingAssignments.ts
'use client'

import { useEffect, useState } from 'react'
import { supabaseStudent } from '@/lib/supabase'
import { Assignment } from '@/lib/supabase'

export function usePollingAssignments(classId: string, intervalSeconds: number = 30) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true)
      try {
        const { data } = await supabaseStudent
          .from('assignments')
          .select('*')
          .eq('class_id', classId)
          .order('deadline', { ascending: true })

        if (data) {
          setAssignments(data)
          setLastUpdate(new Date())
        }
      } catch (err) {
        console.error('Failed to fetch assignments:', err)
      } finally {
        setLoading(false)
      }
    }

    // Fetch immediately
    fetchAssignments()

    // Then poll
    const interval = setInterval(fetchAssignments, intervalSeconds * 1000)

    return () => clearInterval(interval)
  }, [classId, intervalSeconds])

  return { assignments, lastUpdate, loading }
}
