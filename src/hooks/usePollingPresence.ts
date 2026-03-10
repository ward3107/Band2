// hooks/usePollingPresence.ts
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface OnlineStudent {
  student_id: string
  full_name: string
  last_seen: string
}

export function usePollingPresence(classId: string, intervalSeconds: number = 30) {
  const [onlineStudents, setOnlineStudents] = useState<Map<string, OnlineStudent>>(new Map())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Fetch online students
    const fetchOnlineStudents = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('student_presence')
          .select('student_id, profiles!inner(full_name), last_seen')
          .eq('class_id', classId)
          .eq('is_online', true)
          .gte('last_seen', new Date(Date.now() - 2 * 60 * 1000).toISOString()) // Active in last 2 minutes

        if (data) {
          const map = new Map<string, OnlineStudent>()
          data.forEach(item => {
            map.set(item.student_id, {
              student_id: item.student_id,
              full_name: item.profiles.full_name,
              last_seen: item.last_seen
            })
          })
          setOnlineStudents(map)
        }
      } catch (err) {
        console.error('Failed to fetch online students:', err)
      } finally {
        setLoading(false)
      }
    }

    // Fetch immediately
    fetchOnlineStudents()

    // Then poll every N seconds
    const interval = setInterval(fetchOnlineStudents, intervalSeconds * 1000)

    return () => clearInterval(interval)
  }, [classId, intervalSeconds])

  return { onlineStudents, loading, onlineCount: onlineStudents.size }
}
