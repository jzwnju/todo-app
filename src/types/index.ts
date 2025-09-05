import type { Database } from './database'

// 数据库表类型
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type Board = Database['public']['Tables']['boards']['Row']
export type List = Database['public']['Tables']['lists']['Row']
export type Card = Database['public']['Tables']['cards']['Row']

// 插入类型
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type BoardInsert = Database['public']['Tables']['boards']['Insert']
export type ListInsert = Database['public']['Tables']['lists']['Insert']
export type CardInsert = Database['public']['Tables']['cards']['Insert']

// 更新类型
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']
export type BoardUpdate = Database['public']['Tables']['boards']['Update']
export type ListUpdate = Database['public']['Tables']['lists']['Update']
export type CardUpdate = Database['public']['Tables']['cards']['Update']

// 状态枚举
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'failed'
export type Priority = 'low' | 'medium' | 'high'

// 扩展类型，包含关联数据
export interface BoardWithStats extends Board {
  total_cards: number
  completed_cards: number
  lists: Pick<List, 'id'>[]
}

export interface ListWithCards extends List {
  cards: Card[]
}

export interface CardWithDetails extends Card {
  list?: List
}

// 拖放相关类型
export interface DragEndEvent {
  active: {
    id: string
    data: {
      current?: {
        type: 'card'
        card: Card
      }
    }
  }
  over: {
    id: string
    data: {
      current?: {
        type: 'list'
        list: List
      }
    }
  } | null
}

// 认证相关类型
export interface AuthUser {
  id: string
  email: string
  user_metadata: {
    full_name?: string
    avatar_url?: string
    provider?: string
  }
}

// API响应类型
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  loading: boolean
}

// 通知类型
export interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
  timestamp: string
}

// 实时订阅事件类型
export interface RealtimeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, any>
  old: Record<string, any>
  table: string
}