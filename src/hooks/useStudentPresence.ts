// hooks/useStudentPresence.ts
'use client'

import { useEffect, useRef } from 'react'
import { supabaseStudent } from '@/lib/supabase'

/**
 * Hook that tracks a student's online presence.
 * Updates the student_presence table periodically and cleans up on unmount.
 */
export function useStudentPresence(studentId: string, classIds: string[]) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!studentId || classIds.length === 0) {
      return
    }

    // Function to update presence for all enrolled classes
    const updatePresence = async () => {
      const now = new Date().toISOString()

      try {
        // Update presence for each class the student is enrolled in
        await Promise.all(
          classIds.map(classId =>
            supabaseStudent
              .from('student_presence')
              .upsert(
                {
                  student_id: studentId,
                  class_id: classId,
                  is_online: true,
                  last_seen: now,
                },
                {
                  onConflict: 'student_id,class_id',
                }
              )
          )
        )
      } catch (err) {
        console.error('Failed to update presence:', err)
      }
    }

    // Update immediately on mount
    updatePresence()

    // Then update every 30 seconds
    intervalRef.current = setInterval(updatePresence, 30000)

    // Cleanup: set is_online to false when user leaves the page
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // Mark as offline
      Promise.all(
        classIds.map(classId =>
          supabaseStudent
            .from('student_presence')
            .update({ is_online: false })
            .eq('student_id', studentId)
            .eq('class_id', classId)
        )
      ).catch(console.error)
    }
  }, [studentId, classIds.join(',')])
}
