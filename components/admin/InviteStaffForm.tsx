'use client'

import { useState, type FormEvent } from 'react'
import { inviteStaff } from '@/lib/admin/staff-actions'

export function InviteStaffForm() {
  const [result, setResult] = useState<{ password: string } | { error: string } | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setResult(null)
    const formData = new FormData(event.currentTarget)
    const outcome = await inviteStaff(formData)
    setResult(outcome)
    setPending(false)
    if ('password' in outcome) {
      event.currentTarget.reset()
    }
  }

  return (
    <div className="mt-6">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-sm text-gray-700">Email</label>
          <input
            name="email"
            type="email"
            required
            className="rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Ρόλος</label>
          <select name="role" className="rounded border border-gray-300 px-3 py-2">
            <option value="waiter">Σερβιτόρος</option>
            <option value="admin">Διαχειριστής</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {pending ? 'Δημιουργία...' : 'Πρόσκληση'}
        </button>
      </form>

      {result && 'error' in result && <p className="mt-2 text-sm text-red-600">{result.error}</p>}
      {result && 'password' in result && (
        <p className="mt-2 rounded bg-yellow-50 p-3 text-sm text-yellow-800">
          Λογαριασμός δημιουργήθηκε. Προσωρινός κωδικός (αντέγραψέ τον τώρα, δεν θα ξαναφανεί):{' '}
          <strong className="font-mono">{result.password}</strong>
        </p>
      )}
    </div>
  )
}
