import { useNavigate } from 'react-router-dom'

export function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-4">
      <p className="text-6xl font-bold text-slate-200">404</p>
      <h1 className="text-xl font-semibold text-slate-700">Page not found</h1>
      <p className="text-sm text-slate-400">The page you are looking for does not exist.</p>
      <button
        onClick={() => navigate('/')}
        className="mt-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
      >
        Back to Dashboard
      </button>
    </div>
  )
}
