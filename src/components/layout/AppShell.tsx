import { Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import SessionsPage from '../../pages/SessionsPage'
import SessionDetailPage from '../../pages/SessionDetailPage'
import TimerPage from '../../pages/TimerPage'
import SettingsPage from '../../pages/SettingsPage'

export default function AppShell() {
  return (
    <div className="flex min-h-dvh bg-gray-50">
      <Sidebar />
      <main className="flex flex-1 flex-col pb-14 md:pb-0">
        <Routes>
          <Route path="/" element={<Navigate to="/sessions" replace />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/sessions/:id" element={<SessionDetailPage />} />
          <Route path="/timer" element={<TimerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/sessions" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
