'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NIGERIAN_STATES } from '@/lib/constants'

export default function ProfileForm({ customer }: { customer: any }) {
  const [name, setName] = useState(customer?.name || '')
  const [phone, setPhone] = useState(customer?.phone || '')
  const [state, setState] = useState(customer?.state || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase
      .from('customers')
      .update({ name, phone, state })
      .eq('id', customer.id)

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Profile updated successfully')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1e1e1e] p-4 rounded shadow border border-gray-200 dark:border-gray-700">
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Full Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Phone Number</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">State</label>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Select a state</option>
          {NIGERIAN_STATES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded transition"
      >
        {loading ? 'Saving...' : 'Save'}
      </button>
      {message && <p className="mt-2 text-sm text-green-600 dark:text-green-400">{message}</p>}
    </form>
  )
}