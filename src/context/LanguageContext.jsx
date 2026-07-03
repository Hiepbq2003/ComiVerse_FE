import { createContext, useContext, useState, useEffect } from 'react'

const LanguageContext = createContext()

const translations = {
  en: {
    dashboard: "Dashboard",
    project_teams: "Project Teams",
    revenue: "Revenue",
    payout: "Payout",
    logout: "Logout",
    search_placeholder: "Search translation projects...",
    active: "Active",
    paused: "Paused",
    settings: "Settings",
    members: "Members",
    requests: "Requests",
    tasks: "Tasks"
  },
  vi: {
    dashboard: "Bảng điều khiển",
    project_teams: "Nhóm dịch",
    revenue: "Doanh thu",
    payout: "Thanh toán",
    logout: "Đăng xuất",
    search_placeholder: "Tìm kiếm dự án dịch...",
    active: "Hoạt động",
    paused: "Tạm dừng",
    settings: "Cài đặt",
    members: "Thành viên",
    requests: "Yêu cầu gia nhập",
    tasks: "Công việc"
  },
  ja: {
    dashboard: "ダッシュボード",
    project_teams: "翻訳チーム",
    revenue: "収益",
    payout: "支払い",
    logout: "ログアウト",
    search_placeholder: "翻訳プロジェクトを検索...",
    active: "アクティブ",
    paused: "一時停止",
    settings: "設定",
    members: "メンバー",
    requests: "加入申請",
    tasks: "タスク"
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => localStorage.getItem('language') || 'en')

  const setLanguage = (lang) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }

  const t = (key) => {
    return translations[language]?.[key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
