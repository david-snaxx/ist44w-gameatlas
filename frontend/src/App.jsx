import { lazy, Suspense } from 'react'
import {createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation} from 'react-router'
import ToastProvider from './components/Toast/ToastProvider.jsx'
import AccountPage from './pages/Account/AccountPage.jsx'
import AllAssetsPage from './pages/Assets/AllAssetsPage.jsx'
import AssetEditorPage from './pages/Assets/AssetEditorPage.jsx'
import AssetListPage from './pages/Assets/AssetListPage.jsx'
import AssetViewPage from './pages/Assets/AssetViewPage.jsx'
import BlueprintBuilderPage from './pages/Blueprints/BlueprintBuilderPage.jsx'
import BlueprintListPage from './pages/Blueprints/BlueprintListPage.jsx'
import DashboardPage from './pages/Dashboard/DashboardPage.jsx'
import DialogueListPage from './pages/Dialogues/DialogueListPage.jsx'
import LoginPage from './pages/Login/LoginPage.jsx'
import SignUpPage from './pages/Login/SignUpPage.jsx'
import NotFoundPage from './pages/NotFound/NotFoundPage.jsx'
import SettingsPage from './pages/Settings/SettingsPage.jsx'
import {useCurrentUser} from "./api/useCurrentUser.js";

// The dialogue editor brings in React Flow, which is large, so it's only downloaded when that page is opened
const DialogueEditorPage = lazy(() => import('./pages/Dialogues/DialogueEditorPage.jsx'))

// A lazily loaded page shows nothing for the moment it takes to download
function lazyPage(page) {
  return <Suspense fallback={null}>{page}</Suspense>
}


/** Wraps every page that needs a login: a logged-out visitor goes to /login, which remembers where they were headed. */
function RequireLogin() {
  const user = useCurrentUser();
  const location = useLocation();
  if (!user.checked) return null;
  if (!user.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />
}


const router = createBrowserRouter([
  {
    element: <RequireLogin />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/assets', element: <AllAssetsPage /> },
      { path: '/blueprints', element: <BlueprintListPage /> },
      { path: '/blueprints/new', element: <BlueprintBuilderPage /> },
      { path: '/blueprints/:blueprintId', element: <BlueprintBuilderPage /> },
      { path: '/blueprints/:blueprintId/assets', element: <AssetListPage /> },
      { path: '/blueprints/:blueprintId/assets/new', element: <AssetEditorPage /> },
      { path: '/blueprints/:blueprintId/assets/:assetKey', element: <AssetViewPage /> },
      { path: '/blueprints/:blueprintId/assets/:assetKey/edit', element: <AssetEditorPage /> },
      { path: '/dialogues', element: <DialogueListPage /> },
      { path: '/dialogues/new', element: lazyPage(<DialogueEditorPage />) },
      { path: '/dialogues/:dialogueKey', element: lazyPage(<DialogueEditorPage />) },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/account', element: <AccountPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignUpPage /> },
  { path: '*', element: <NotFoundPage /> },
])

function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  )
}

export default App
