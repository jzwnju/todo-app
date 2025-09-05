import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { PlusIcon, Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline'
import type { Board, BoardWithStats } from '../types'

export default function Dashboard() {
  const { user, profile, signOut } = useAuth()
  const [boards, setBoards] = useState<BoardWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newBoardTitle, setNewBoardTitle] = useState('')
  const [newBoardDescription, setNewBoardDescription] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (user) {
      fetchBoards()
    }
  }, [user])

  const fetchBoards = async () => {
    try {
      setLoading(true)
      
      // 获取用户的所有看板
      const { data: boardsData, error: boardsError } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (boardsError) {
        console.error('Error fetching boards:', boardsError)
        return
      }

      // 为每个看板获取统计信息
      const boardsWithStats = await Promise.all(
        boardsData.map(async (board) => {
          const { data: cardsData } = await supabase
            .from('cards')
            .select('status')
            .in('list_id', [
              // 需要先获取该看板的所有列表ID
            ])

          // 获取看板的列表
          const { data: listsData } = await supabase
            .from('lists')
            .select('id')
            .eq('board_id', board.id)

          if (listsData) {
            const listIds = listsData.map(list => list.id)
            
            const { data: cardsData } = await supabase
              .from('cards')
              .select('status')
              .in('list_id', listIds)

            const totalCards = cardsData?.length || 0
            const completedCards = cardsData?.filter(card => card.status === 'completed').length || 0

            return {
              ...board,
              total_cards: totalCards,
              completed_cards: completedCards,
              lists: listsData
            }
          }

          return {
            ...board,
            total_cards: 0,
            completed_cards: 0,
            lists: []
          }
        })
      )

      setBoards(boardsWithStats)
    } catch (error) {
      console.error('Error fetching boards:', error)
    } finally {
      setLoading(false)
    }
  }

  const createBoard = async () => {
    if (!newBoardTitle.trim() || !user) return

    setCreating(true)
    try {
      // 创建看板
      const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .insert({
          title: newBoardTitle.trim(),
          description: newBoardDescription.trim(),
          user_id: user.id
        })
        .select()
        .single()

      if (boardError) {
        console.error('Error creating board:', boardError)
        return
      }

      // 创建默认列表
      const defaultLists = [
        { title: '待办事项', status: 'todo' as const, position: 0 },
        { title: '进行中', status: 'in_progress' as const, position: 1 },
        { title: '已完成', status: 'completed' as const, position: 2 },
        { title: '已失败', status: 'failed' as const, position: 3 }
      ]

      const { error: listsError } = await supabase
        .from('lists')
        .insert(
          defaultLists.map(list => ({
            ...list,
            board_id: boardData.id
          }))
        )

      if (listsError) {
        console.error('Error creating default lists:', listsError)
      }

      // 重新获取看板列表
      await fetchBoards()
      
      // 重置表单
      setNewBoardTitle('')
      setNewBoardDescription('')
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating board:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h1 className="ml-3 text-xl font-semibold text-gray-900">Todo 看板</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md ${
                    viewMode === 'grid'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Squares2X2Icon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md ${
                    viewMode === 'list'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <ListBulletIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-700">
                  欢迎, {profile?.full_name || user?.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  退出登录
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">我的看板</h2>
            <p className="text-gray-600 mt-1">管理您的项目和任务</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>创建看板</span>
          </button>
        </div>

        {/* 看板列表 */}
        {boards.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center">
              <Squares2X2Icon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">还没有看板</h3>
            <p className="mt-2 text-gray-500">创建您的第一个看板来开始管理任务</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              创建看板
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {boards.map((board) => (
              <Link
                key={board.id}
                to={`/board/${board.id}`}
                className="block bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {board.title}
                  </h3>
                  {board.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {board.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {board.total_cards} 个任务
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: board.total_cards > 0 
                              ? `${(board.completed_cards / board.total_cards) * 100}%` 
                              : '0%'
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {board.total_cards > 0 
                          ? Math.round((board.completed_cards / board.total_cards) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* 创建看板模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">创建新看板</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  看板名称
                </label>
                <input
                  type="text"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入看板名称"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述 (可选)
                </label>
                <textarea
                  value={newBoardDescription}
                  onChange={(e) => setNewBoardDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入看板描述"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewBoardTitle('')
                  setNewBoardDescription('')
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={creating}
              >
                取消
              </button>
              <button
                onClick={createBoard}
                disabled={!newBoardTitle.trim() || creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? '创建中...' : '创建看板'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}