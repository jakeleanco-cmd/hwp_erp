import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 관리자 인증 상태 관리 스토어
 * aca_erp 패턴을 따라 JWT 토큰과 관리자 정보를 localStorage에 보관합니다.
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      
      /** 인증 정보 설정 */
      setAuth: (token, user) => set({ token, user }),
      
      /** 유저 정보 업데이트 */
      updateUser: (updatedUser) => set((state) => ({ 
        user: { ...state.user, ...updatedUser } 
      })),
      
      /** 로그아웃 */
      logout: () => set({ token: null, user: null }),
      
      /** 인증 여부 확인 */
      isAuthenticated: () => !!useAuthStore.getState().token,
    }),
    {
      name: 'hwp-erp-auth', // localStorage 키 이름
    }
  )
);
