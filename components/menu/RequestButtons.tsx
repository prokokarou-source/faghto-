'use client'

import { useState } from 'react'

type RequestType = 'call_waiter' | 'bill'

const REQUEST_LABELS: Record<RequestType, string> = {
  call_waiter: 'Κάλεσε σερβιτόρο',
  bill: 'Ζήτα λογαριασμό',
}

export function RequestButtons({ qrToken }: { qrToken: string }) {
  const [sentType, setSentType] = useState<RequestType | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function sendRequest(type: RequestType) {
    setError(null)
    const response = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrToken, type }),
    })

    if (response.status === 429) {
      setError('Το ζήτησες ήδη πρόσφατα — περίμενε λίγο.')
      return
    }

    if (!response.ok) {
      setError('Κάτι πήγε στραβά, δοκίμασε ξανά.')
      return
    }

    setSentType(type)
    setTimeout(() => setSentType(null), 5000)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white p-4">
      {error && <p className="mb-2 text-center text-sm text-red-600">{error}</p>}
      <div className="mx-auto flex max-w-2xl gap-3">
        {(['call_waiter', 'bill'] as const).map((type) => (
          <button
            key={type}
            onClick={() => sendRequest(type)}
            disabled={sentType === type}
            className="flex-1 rounded bg-gray-900 py-3 text-white disabled:opacity-50"
          >
            {sentType === type ? 'Ζητήθηκε!' : REQUEST_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  )
}
