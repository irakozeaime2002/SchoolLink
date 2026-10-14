import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto pt-16 sm:pt-6">
        <Outlet />
      </main>
    </div>
  )
}
