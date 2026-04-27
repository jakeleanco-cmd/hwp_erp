import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/**
 * 인증된 사용자만 접근할 수 있도록 보호하는 컴포넌트
 */
const PrivateRoute = ({ children }) => {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!token) {
    // 로그인 페이지로 리다이렉트하며, 현재 위치를 저장하여 로그인 후 다시 돌아올 수 있게 함
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default PrivateRoute;
