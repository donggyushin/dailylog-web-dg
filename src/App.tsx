import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { EmailVerificationPage } from './pages/EmailVerificationPage';
import { HomePage } from './pages/HomePage';
import { ChatPage } from './pages/ChatPage';
import { ChatHistoryPage } from './pages/ChatHistoryPage';
import { DiaryDetailPage } from './pages/DiaryDetailPage';
import { DiaryEditorPage } from './pages/DiaryEditorPage';
import { ProfilePage } from './pages/ProfilePage';
import { StatisticsPage } from './pages/StatisticsPage';
import { SavedDiariesPage } from './pages/SavedDiariesPage';
import { SearchPage } from './pages/SearchPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { GuestRoute } from './components/GuestRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <GuestRoute>
              <SignupPage />
            </GuestRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <GuestRoute>
              <ForgotPasswordPage />
            </GuestRoute>
          }
        />
        <Route
          path="/verify-email"
          element={
            <ProtectedRoute>
              <EmailVerificationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/history/:id"
          element={
            <ProtectedRoute>
              <ChatHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/diary/new"
          element={
            <ProtectedRoute>
              <DiaryEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/diary/:id/edit"
          element={
            <ProtectedRoute>
              <DiaryEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/diary/:id"
          element={
            <ProtectedRoute>
              <DiaryDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/statistics"
          element={
            <ProtectedRoute>
              <StatisticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/saved"
          element={
            <ProtectedRoute>
              <SavedDiariesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
