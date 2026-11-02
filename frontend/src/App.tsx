import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { RequireActiveAccount, RequireActiveProvider, RequireSession } from './auth/guards'
import { Layout } from './components/Layout'
import { supabaseConfigured } from './lib/supabase'
import AccountPage from './pages/AccountPage'
import BecomeProvider from './pages/BecomeProvider'
import Dashboard from './pages/Dashboard'
import FindServices from './pages/FindServices'
import JobBoard from './pages/JobBoard'
import Landing from './pages/Landing'
import ListingEditor from './pages/ListingEditor'
import PostJob from './pages/PostJob'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import VerifyStudent from './pages/VerifyStudent'
import Welcome from './pages/Welcome'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {!supabaseConfigured && (
          <div className="setup-banner" role="alert">
            Supabase isn't configured. Copy <code>frontend/.env.example</code> to <code>.env.local</code>, add the publishable key, and restart <code>npm run dev</code>.
          </div>
        )}
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="signup" element={<SignUp />} />
            <Route path="signin" element={<SignIn />} />
            <Route path="find" element={<FindServices />} />
            <Route path="verify-student" element={<VerifyStudent />} />
            <Route path="welcome" element={<RequireSession><Welcome /></RequireSession>} />

            <Route path="dashboard" element={<RequireActiveAccount><Dashboard /></RequireActiveAccount>} />
            <Route path="account" element={<RequireActiveAccount><AccountPage /></RequireActiveAccount>} />
            <Route path="jobs/new" element={<RequireActiveAccount><PostJob /></RequireActiveAccount>} />
            <Route path="become-provider" element={<RequireActiveAccount><BecomeProvider /></RequireActiveAccount>} />
            <Route path="listings/new" element={<RequireActiveAccount><ListingEditor /></RequireActiveAccount>} />
            <Route path="listings/:id" element={<RequireActiveAccount><ListingEditor /></RequireActiveAccount>} />
            <Route path="job-board" element={<RequireActiveProvider><JobBoard /></RequireActiveProvider>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
