import { UsersManager } from '../../../../components/shared/UsersManager'

// [VIEW-AS-PARITY] Вкладка «Клиенты» owner-кабинета рендерит тот же UsersManager,
// что и admin → Пользователи: одна таблица, одни модалки, одни API
// (/admin/users, /owner/control/extend-subscription).
export function ClientsTab() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <UsersManager />
    </div>
  )
}
