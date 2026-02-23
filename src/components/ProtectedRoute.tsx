import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 이메일 인증 페이지가 아니고, 이메일 인증이 안 된 경우 이메일 인증 페이지로 리다이렉트
  if (location.pathname !== '/verify-email' && !user.email_verified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
}
