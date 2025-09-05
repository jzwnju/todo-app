import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { RealtimeEvent } from '../types'

interface UseRealtimeSubscriptionProps {
  table: string
  filter?: string
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
  enabled?: boolean
}

export function useRealtimeSubscription({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true
}: UseRealtimeSubscriptionProps) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!enabled) return

    // 创建实时订阅频道
    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter
        },
        (payload) => {
          console.log('Realtime event:', payload)
          
          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload)
              break
            case 'UPDATE':
              onUpdate?.(payload)
              break
            case 'DELETE':
              onDelete?.(payload)
              break
          }
        }
      )
      .subscribe((status) => {
        console.log(`Subscription status for ${table}:`, status)
      })

    channelRef.current = channel

    // 清理函数
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [table, filter, onInsert, onUpdate, onDelete, enabled])

  // 手动取消订阅
  const unsubscribe = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }

  return { unsubscribe }
}

// 专门用于看板的实时订阅钩子
export function useBoardRealtimeSubscription(
  boardId: string | undefined,
  onBoardUpdate?: (board: any) => void,
  onListUpdate?: (list: any) => void,
  onCardUpdate?: (card: any) => void
) {
  // 订阅看板变更
  const boardSubscription = useRealtimeSubscription({
    table: 'boards',
    filter: boardId ? `id=eq.${boardId}` : undefined,
    onUpdate: onBoardUpdate,
    enabled: !!boardId
  })

  // 订阅列表变更
  const listSubscription = useRealtimeSubscription({
    table: 'lists',
    filter: boardId ? `board_id=eq.${boardId}` : undefined,
    onInsert: onListUpdate,
    onUpdate: onListUpdate,
    onDelete: onListUpdate,
    enabled: !!boardId
  })

  // 订阅卡片变更
  const cardSubscription = useRealtimeSubscription({
    table: 'cards',
    onInsert: onCardUpdate,
    onUpdate: onCardUpdate,
    onDelete: onCardUpdate,
    enabled: !!boardId
  })

  const unsubscribeAll = () => {
    boardSubscription.unsubscribe()
    listSubscription.unsubscribe()
    cardSubscription.unsubscribe()
  }

  return { unsubscribeAll }
}