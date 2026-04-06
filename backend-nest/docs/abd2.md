# دليل ربط الفرونت إند بالباك إند

> **المشروع:** نظام إدارة المستودع  
> **الباك إند:** `https://werehouse-production-dabe.up.railway.app/api`  
> **State Management:** Zustand  
> **المشكلة الأساسية:** عند الـ refresh بيضيع الـ user من الـ state — هاد الدليل بيحلها بالطريقة الصح

---

## 1. كيف يعمل نظام المصادقة

الباك إند بيرجع التوكن بطريقتين في نفس الوقت:

```
POST /api/auth/login
↓
Response Body  → { token, user }        ← أنت بتحفظه
Set-Cookie     → warehouse_access_token  ← الباك بيحطه تلقائياً (HttpOnly)
```

الـ cookie هو `HttpOnly` — يعني JavaScript ما بتقدر تقراه، بس المتصفح بيبعثه تلقائياً مع كل طلب إذا `credentials: 'include'`.

**الاستراتيجية الصح:**
- احفظ الـ `token` و `user` بـ Zustand + `localStorage` للـ UI
- ابعث `credentials: 'include'` مع كل fetch لحتى الـ cookie يشتغل
- عند الـ refresh، اعمل `GET /api/auth/me` لتجيب بيانات المستخدم من جديد

---

## 2. إعداد Zustand — Auth Store

```ts
// stores/auth.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  username: string
  email: string
  role: string
  permissions: string[]
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean

  setAuth: (token: string, user: User) => void
  clearAuth: () => void
  setLoading: (v: boolean) => void
  hydrate: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (token, user) =>
        set({ token, user, isAuthenticated: true, isLoading: false }),

      clearAuth: () =>
        set({ token: null, user: null, isAuthenticated: false, isLoading: false }),

      setLoading: (v) => set({ isLoading: v }),

      // هاد بتستدعيه مرة وحدة عند بداية التطبيق
      hydrate: async () => {
        set({ isLoading: true })
        try {
          const res = await fetch(
            'https://werehouse-production-dabe.up.railway.app/api/auth/me',
            {
              method: 'GET',
              credentials: 'include', // مهم — بيبعث الـ cookie
              headers: {
                // إذا عندك توكن محفوظ بالـ store بعثه كمان
                ...(get().token
                  ? { Authorization: `Bearer ${get().token}` }
                  : {}),
              },
            }
          )

          if (res.ok) {
            const user = await res.json()
            set({ user, isAuthenticated: true, isLoading: false })
          } else {
            // التوكن انتهى أو غير صالح
            set({ token: null, user: null, isAuthenticated: false, isLoading: false })
          }
        } catch {
          set({ token: null, user: null, isAuthenticated: false, isLoading: false })
        }
      },
    }),
    {
      name: 'warehouse-auth', // اسم الـ key بالـ localStorage
      // احفظ التوكن والـ user بس، مش الـ loading
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
```

---

## 3. حل مشكلة الـ Refresh

عند الـ refresh، الـ Zustand بيرجع البيانات من الـ localStorage بسرعة، بس لازم تتحقق إن التوكن لسا صالح عند الباك إند.

```tsx
// App.tsx أو main layout
import { useEffect } from 'react'
import { useAuthStore } from './stores/auth.store'

export function App() {
  const hydrate = useAuthStore((s) => s.hydrate)
  const isLoading = useAuthStore((s) => s.isLoading)

  useEffect(() => {
    // استدعي مرة وحدة عند تحميل التطبيق
    hydrate()
  }, [hydrate])

  if (isLoading) {
    return <div>جاري التحقق من الجلسة...</div>
  }

  return <RouterProvider router={router} />
}
```

**الترتيب اللي بيصير:**
```
1. التطبيق يفتح
2. Zustand يقرأ من localStorage → user موجود (بسرعة، بدون flash)
3. hydrate() تبعث GET /api/auth/me
4. إذا الباك رجع 200 → المستخدم لسا مسجل دخول ✓
5. إذا رجع 401 → clearAuth() → redirect لصفحة الدخول
```

---

## 4. API Client — الطريقة الصح

اعمل wrapper واحد لكل الـ fetch calls بدل ما تكرر الـ headers بكل مكان:

```ts
// lib/api.ts
const BASE_URL = 'https://werehouse-production-dabe.up.railway.app/api'

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // جيب التوكن من الـ store مباشرة (خارج React)
  const token = useAuthStore.getState().token

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // دايماً — للـ cookie
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  // إذا انتهت الجلسة
  if (res.status === 401) {
    useAuthStore.getState().clearAuth()
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `HTTP ${res.status}`)
  }

  // بعض الـ endpoints بترجع 204 بدون body
  if (res.status === 204) return null as T

  return res.json()
}

export const api = {
  get:    <T>(url: string, opts?: RequestInit) =>
    apiFetch<T>(url, { method: 'GET', ...opts }),

  post:   <T>(url: string, body: unknown, opts?: RequestInit) =>
    apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body), ...opts }),

  put:    <T>(url: string, body: unknown, opts?: RequestInit) =>
    apiFetch<T>(url, { method: 'PUT', body: JSON.stringify(body), ...opts }),

  delete: <T>(url: string, opts?: RequestInit) =>
    apiFetch<T>(url, { method: 'DELETE', ...opts }),
}
```

---

## 5. تسجيل الدخول والخروج

```ts
// stores/auth.store.ts — أضف هاتين الدوال

login: async (username: string, password: string) => {
  set({ isLoading: true })
  const res = await fetch(
    'https://werehouse-production-dabe.up.railway.app/api/auth/login',
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }
  )

  if (!res.ok) {
    set({ isLoading: false })
    const err = await res.json()
    throw new Error(err.message || 'Login failed')
  }

  const data = await res.json()
  // data = { token, user: { id, username, email, role, permissions } }
  set({
    token: data.token,
    user: data.user,
    isAuthenticated: true,
    isLoading: false,
  })
},

logout: async () => {
  await fetch(
    'https://werehouse-production-dabe.up.railway.app/api/auth/logout',
    { method: 'POST', credentials: 'include' }
  ).catch(() => {}) // مش مهم إذا فشل
  set({ token: null, user: null, isAuthenticated: false })
},
```

---

## 6. حماية الصفحات — Protected Route

```tsx
// components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth.store'

interface Props {
  children: React.ReactNode
  permission?: string // اختياري — إذا الصفحة تحتاج صلاحية معينة
}

export function ProtectedRoute({ children, permission }: Props) {
  const { isAuthenticated, isLoading, user } = useAuthStore()

  if (isLoading) return <div>جاري التحقق...</div>

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (permission && !user?.permissions.includes(permission)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

// الاستخدام في الـ router:
// <Route path="/payroll" element={
//   <ProtectedRoute permission="view_payroll">
//     <PayrollPage />
//   </ProtectedRoute>
// } />
```

---

## 7. Zustand Stores للبيانات

اعمل store منفصل لكل module — لا تحط كل شيء بـ store وحدة:

```ts
// stores/employees.store.ts
import { create } from 'zustand'
import { api } from '../lib/api'

interface Employee {
  id: string
  employeeId: string
  name: string
  department: string
  status: string
}

interface EmployeesState {
  employees: Employee[]
  total: number
  isLoading: boolean
  error: string | null
  fetch: (params?: { page?: number; department?: string; search?: string }) => Promise<void>
  reset: () => void
}

export const useEmployeesStore = create<EmployeesState>((set) => ({
  employees: [],
  total: 0,
  isLoading: false,
  error: null,

  fetch: async (params = {}) => {
    set({ isLoading: true, error: null })
    try {
      const query = new URLSearchParams({
        page: String(params.page ?? 1),
        limit: '20',
        ...(params.department ? { department: params.department } : {}),
        ...(params.search ? { search: params.search } : {}),
      })
      const data = await api.get<{ employees: Employee[]; pagination: { total: number } }>(
        `/employees?${query}`
      )
      set({ employees: data.employees, total: data.pagination.total, isLoading: false })
    } catch (e: unknown) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  reset: () => set({ employees: [], total: 0, error: null }),
}))
```

**نفس النمط لباقي الـ modules:**

| Store | Endpoint الأساسي |
|---|---|
| `useEmployeesStore` | `/employees` |
| `useAttendanceStore` | `/attendance` |
| `usePayrollStore` | `/payroll` |
| `useSalaryStore` | `/salary` |
| `useAdvancesStore` | `/advances` |
| `useInsuranceStore` | `/insurance` |
| `useBonusesStore` | `/bonuses` |
| `useInventoryStore` | `/inventory/products` |

---

## 8. قائمة الصلاحيات — للـ UI

استخدم الـ permissions من الـ user لإخفاء/إظهار العناصر:

```tsx
// hooks/usePermission.ts
import { useAuthStore } from '../stores/auth.store'

export function usePermission(permission: string): boolean {
  const permissions = useAuthStore((s) => s.user?.permissions ?? [])
  return permissions.includes(permission)
}

// الاستخدام:
// const canRunPayroll = usePermission('run_payroll')
// const canManageSalary = usePermission('manage_salary')
```

**الصلاحيات الكاملة:**
```
view_employees      edit_employees      delete_employees
view_devices        manage_devices
manage_users        manage_roles
view_attendance     edit_attendance
view_payroll        run_payroll         approve_payroll
view_inventory      edit_inventory
view_imports        run_imports
manage_salary       manage_advances     manage_insurance    manage_bonuses
```

---

## 9. مثال كامل — صفحة Login

```tsx
// pages/LoginPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth.store'

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="اسم المستخدم" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور" />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
      </button>
    </form>
  )
}
```

---

## 10. ملخص — الأخطاء الشائعة وحلها

| المشكلة | السبب | الحل |
|---|---|---|
| بيطلع من الدخول عند الـ refresh | ما في `hydrate()` عند بداية التطبيق | استدعي `hydrate()` في `useEffect` بالـ root component |
| 401 على كل الطلبات | ما بيبعث الـ token | أضف `Authorization: Bearer ${token}` للـ headers |
| الـ cookie ما بيشتغل | ناسي `credentials: 'include'` | أضفها لكل fetch |
| CORS error | الباك ما بيقبل الـ origin | تأكد إن `CORS_ORIGIN` بالـ env يحتوي على domain الفرونت |
| بيانات قديمة بعد التعديل | ما بتعمل re-fetch بعد الـ mutation | بعد كل POST/PUT/DELETE استدعي `store.fetch()` من جديد |
| الـ store بيتمسح عند logout | طبيعي | `clearAuth()` بتمسح الـ localStorage تلقائياً عبر Zustand persist |
