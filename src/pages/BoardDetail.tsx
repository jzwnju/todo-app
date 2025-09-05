import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useBoardRealtimeSubscription } from '../hooks/useRealtimeSubscription'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline'
import type { Board, List, Card, ListWithCards } from '../types'

// 可拖拽的卡片组件
function DraggableCard({ card }: { card: Card }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
    >
      <h4 className="font-medium text-gray-900 mb-2">{card.title}</h4>
      {card.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{card.description}</p>
      )}
      
      <div className="flex items-center justify-between">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(card.priority)}`}>
          {card.priority === 'high' ? '高' : card.priority === 'medium' ? '中' : '低'}
        </span>
        {card.due_date && (
          <span className="text-xs text-gray-500">
            {new Date(card.due_date).toLocaleDateString('zh-CN')}
          </span>
        )}
      </div>
    </div>
  )
}

// 可放置的列表组件
function DroppableList({ list, cards, onAddCard }: { 
  list: List
  cards: Card[]
  onAddCard: (listId: string) => void
}) {
  const {
    setNodeRef,
    isOver
  } = useSortable({ id: list.id })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'border-blue-200 bg-blue-50'
      case 'in_progress': return 'border-yellow-200 bg-yellow-50'
      case 'completed': return 'border-green-200 bg-green-50'
      case 'failed': return 'border-red-200 bg-red-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-80 ${getStatusColor(list.status)} border-2 rounded-lg p-4 ${
        isOver ? 'border-blue-400 bg-blue-100' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{list.title}</h3>
        <div className="flex items-center space-x-2">
          <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
            {cards.length}
          </span>
          <button
            onClick={() => onAddCard(list.id)}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-white rounded"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <SortableContext items={cards.map(card => card.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 min-h-32">
          {cards.map((card) => (
            <DraggableCard key={card.id} card={card} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

export default function BoardDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [board, setBoard] = useState<Board | null>(null)
  const [lists, setLists] = useState<ListWithCards[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [showAddCardModal, setShowAddCardModal] = useState(false)
  const [selectedListId, setSelectedListId] = useState<string>('')
  const [newCardTitle, setNewCardTitle] = useState('')
  const [newCardDescription, setNewCardDescription] = useState('')
  const [newCardPriority, setNewCardPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [creating, setCreating] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    if (id && user) {
      fetchBoardData()
    }
  }, [id, user])

  // 实时订阅
  useBoardRealtimeSubscription(
    id,
    // 看板更新
    (payload) => {
      if (payload.new) {
        setBoard(payload.new)
      }
    },
    // 列表更新
    (payload) => {
      fetchBoardData() // 重新获取数据以保持同步
    },
    // 卡片更新
    (payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        // 添加新卡片
        setLists(prevLists => 
          prevLists.map(list => 
            list.id === payload.new.list_id
              ? { ...list, cards: [...list.cards, payload.new] }
              : list
          )
        )
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        // 更新卡片
        setLists(prevLists => 
          prevLists.map(list => ({
            ...list,
            cards: list.cards.map(card => 
              card.id === payload.new.id ? payload.new : card
            ).filter(card => card.list_id === list.id)
          }))
        )
        
        // 如果卡片移动到了新列表，需要添加到目标列表
        if (payload.old && payload.old.list_id !== payload.new.list_id) {
          setLists(prevLists => 
            prevLists.map(list => 
              list.id === payload.new.list_id
                ? { ...list, cards: [...list.cards.filter(c => c.id !== payload.new.id), payload.new] }
                : { ...list, cards: list.cards.filter(c => c.id !== payload.new.id) }
            )
          )
        }
      } else if (payload.eventType === 'DELETE' && payload.old) {
        // 删除卡片
        setLists(prevLists => 
          prevLists.map(list => ({
            ...list,
            cards: list.cards.filter(card => card.id !== payload.old.id)
          }))
        )
      }
    }
  )

  const fetchBoardData = async () => {
    if (!id || !user) return

    try {
      setLoading(true)
      
      // 获取看板信息
      const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (boardError) {
        console.error('Error fetching board:', boardError)
        return
      }

      setBoard(boardData)

      // 获取列表和卡片
      const { data: listsData, error: listsError } = await supabase
        .from('lists')
        .select('*')
        .eq('board_id', id)
        .order('position')

      if (listsError) {
        console.error('Error fetching lists:', listsError)
        return
      }

      // 为每个列表获取卡片
      const listsWithCards = await Promise.all(
        listsData.map(async (list) => {
          const { data: cardsData, error: cardsError } = await supabase
            .from('cards')
            .select('*')
            .eq('list_id', list.id)
            .order('position')

          if (cardsError) {
            console.error('Error fetching cards:', cardsError)
            return { ...list, cards: [] }
          }

          return { ...list, cards: cardsData || [] }
        })
      )

      setLists(listsWithCards)
    } catch (error) {
      console.error('Error fetching board data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const card = lists
      .flatMap(list => list.cards)
      .find(card => card.id === active.id)
    
    setActiveCard(card || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)

    if (!over) return

    const activeCardId = active.id as string
    const overListId = over.id as string

    // 找到被拖拽的卡片和目标列表
    const activeCard = lists
      .flatMap(list => list.cards)
      .find(card => card.id === activeCardId)
    
    const targetList = lists.find(list => list.id === overListId)
    
    if (!activeCard || !targetList) return

    // 如果卡片移动到不同的列表
    if (activeCard.list_id !== overListId) {
      try {
        // 更新数据库中的卡片
        const { error } = await supabase
          .from('cards')
          .update({
            list_id: overListId,
            status: targetList.status,
            position: targetList.cards.length
          })
          .eq('id', activeCardId)

        if (error) {
          console.error('Error updating card:', error)
          return
        }

        // 更新本地状态
        setLists(prevLists => {
          const newLists = prevLists.map(list => {
            if (list.id === activeCard.list_id) {
              // 从原列表移除卡片
              return {
                ...list,
                cards: list.cards.filter(card => card.id !== activeCardId)
              }
            } else if (list.id === overListId) {
              // 添加到目标列表
              return {
                ...list,
                cards: [...list.cards, { ...activeCard, list_id: overListId, status: list.status }]
              }
            }
            return list
          })
          return newLists
        })
      } catch (error) {
        console.error('Error moving card:', error)
      }
    }
  }

  const handleAddCard = (listId: string) => {
    setSelectedListId(listId)
    setShowAddCardModal(true)
  }

  const createCard = async () => {
    if (!newCardTitle.trim() || !selectedListId || !user) return

    setCreating(true)
    try {
      const targetList = lists.find(list => list.id === selectedListId)
      if (!targetList) return

      const { data, error } = await supabase
        .from('cards')
        .insert({
          title: newCardTitle.trim(),
          description: newCardDescription.trim(),
          priority: newCardPriority,
          status: targetList.status,
          list_id: selectedListId,
          user_id: user.id,
          position: targetList.cards.length
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating card:', error)
        return
      }

      // 更新本地状态
      setLists(prevLists => 
        prevLists.map(list => 
          list.id === selectedListId
            ? { ...list, cards: [...list.cards, data] }
            : list
        )
      )

      // 重置表单
      setNewCardTitle('')
      setNewCardDescription('')
      setNewCardPriority('medium')
      setShowAddCardModal(false)
      setSelectedListId('')
    } catch (error) {
      console.error('Error creating card:', error)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">看板不存在</h2>
          <Link to="/dashboard" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
            返回看板列表
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              to="/dashboard"
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              返回
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{board.title}</h1>
              {board.description && (
                <p className="text-sm text-gray-600">{board.description}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 看板内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex space-x-6 overflow-x-auto pb-4">
            <SortableContext items={lists.map(list => list.id)} strategy={verticalListSortingStrategy}>
              {lists.map((list) => (
                <DroppableList
                  key={list.id}
                  list={list}
                  cards={list.cards}
                  onAddCard={handleAddCard}
                />
              ))}
            </SortableContext>
          </div>
          
          <DragOverlay>
            {activeCard ? <DraggableCard card={activeCard} /> : null}
          </DragOverlay>
        </DndContext>
      </main>

      {/* 添加卡片模态框 */}
      {showAddCardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">添加新任务</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  任务标题
                </label>
                <input
                  type="text"
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入任务标题"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述 (可选)
                </label>
                <textarea
                  value={newCardDescription}
                  onChange={(e) => setNewCardDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入任务描述"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  优先级
                </label>
                <select
                  value={newCardPriority}
                  onChange={(e) => setNewCardPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddCardModal(false)
                  setNewCardTitle('')
                  setNewCardDescription('')
                  setNewCardPriority('medium')
                  setSelectedListId('')
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={creating}
              >
                取消
              </button>
              <button
                onClick={createCard}
                disabled={!newCardTitle.trim() || creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? '创建中...' : '创建任务'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}