import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

const EmailConfirm: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const token_hash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        
        if (!token_hash || !type) {
          setStatus('error')
          setMessage('验证链接无效或已过期')
          return
        }

        // 验证邮箱
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any
        })

        if (error) {
          console.error('邮箱验证失败:', error)
          setStatus('error')
          setMessage(error.message || '邮箱验证失败，请重试')
        } else {
          setStatus('success')
          setMessage('邮箱验证成功！正在跳转到看板页面...')
          
          // 3秒后跳转到看板页面
          setTimeout(() => {
            navigate('/dashboard')
          }, 3000)
        }
      } catch (error) {
        console.error('验证过程出错:', error)
        setStatus('error')
        setMessage('验证过程出错，请重试')
      }
    }

    confirmEmail()
  }, [searchParams, navigate])

  const handleReturnToLogin = () => {
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">正在验证邮箱</h2>
              <p className="text-gray-600">请稍候，我们正在验证您的邮箱地址...</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">验证成功！</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-sm text-gray-500">正在跳转...</span>
              </div>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">验证失败</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <button
                onClick={handleReturnToLogin}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                返回登录页面
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default EmailConfirm