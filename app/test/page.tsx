'use client'

import { useState } from 'react'
import { generateScenes } from '../actions/generate-scenes'

export default function TestPage() {
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testStory = `第一幕
這是一個老爺爺，他旁邊家裡有小河，家是木屋，他穿著中國古時候的服裝從家裡走出，背後背著中國古劍
第二幕
他朝向遠方去看，揮手變出梅花，背景有梅花飄散，古劍還在背上背著
第三幕
最後他往高空一跳，把劍揮出去，梅花在背景飄散`

  const handleTest = async () => {
    setLoading(true)
    setError('')
    try {
      console.log('Testing generate scenes...')
      const result = await generateScenes(
        testStory,
        3,
        '2D Animation',
        { name: 'Mandarin Chinese (China)', code: 'cmn-CN' }
      )
      console.log('Success:', result)
      setResult(result)
    } catch (err) {
      console.error('Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Generate Scenes</h1>
      
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Test Story:</h2>
        <pre className="whitespace-pre-wrap text-sm">{testStory}</pre>
      </div>

      <button
        onClick={handleTest}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Generate Scenes'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          <h3 className="font-semibold">Error:</h3>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-100 rounded">
          <h3 className="font-semibold">Success!</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}