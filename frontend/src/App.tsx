import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { RequireActiveAccount, RequireActiveProvider, RequireSession } from './auth/guards'
import { Layout } from './components/Layout'
import { supabaseConfigured } from './lib/supabase'
import AccountPage from './pages/AccountPage'
import BecomeProvider from './pages/BecomeProvider'
import { About, Contact, Services } from './pages/Company'
import BookingDetail from './pages/BookingDetail'
import Bookings from './pages/Bookings'
import Dashboard from './pages/Dashboard'
import FindServices from './pages/FindServices'
import JobBoard from './pages/JobBoard'
import Help from './pages/Help'
import HowItWorks from './pages/HowItWorks'
import Landing from './pages/Landing'
import { Privacy, Terms } from './pages/Legal'
import Pricing from './pages/Pricing'
import Safety from './pages/Safety'
import ListingEditor from './pages/ListingEditor'
import PostJob from './pages/PostJob'
import RequestBooking from './pages/RequestBooking'
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
            <Route path="about" element={<About />} />
            <Route path="services" element={<Services />} />
            <Route path="contact" element={<Contact />} />
            <Route path="how-it-works" element={<HowItWorks />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="safety" element={<Safety />} />
            <Route path="help" element={<Help />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
            <Route path="verify-student" element={<VerifyStudent />} />
            <Route path="welcome" element={<RequireSession><Welcome /></RequireSession>} />

            <Route path="dashboard" element={<RequireActiveAccount><Dashboard /></RequireActiveAccount>} />
            <Route path="account" element={<RequireActiveAccount><AccountPage /></RequireActiveAccount>} />
            <Route path="jobs/new" element={<RequireActiveAccount><PostJob /></RequireActiveAccount>} />
            <Route path="become-provider" element={<RequireActiveAccount><BecomeProvider /></RequireActiveAccount>} />
            <Route path="listings/new" element={<RequireActiveAccount><ListingEditor /></RequireActiveAccount>} />
            <Route path="listings/:id" element={<RequireActiveAccount><ListingEditor /></RequireActiveAccount>} />
            <Route path="job-board" element={<RequireActiveProvider><JobBoard /></RequireActiveProvider>} />
            <Route path="book/:listingId" element={<RequireActiveAccount><RequestBooking /></RequireActiveAccount>} />
            <Route path="bookings" element={<RequireActiveAccount><Bookings role="client" /></RequireActiveAccount>} />
            <Route path="bookings/:id" element={<RequireActiveAccount><BookingDetail role="client" /></RequireActiveAccount>} />
            <Route path="provider/bookings" element={<RequireActiveProvider><Bookings role="provider" /></RequireActiveProvider>} />
            <Route path="provider/bookings/:id" element={<RequireActiveProvider><BookingDetail role="provider" /></RequireActiveProvider>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
