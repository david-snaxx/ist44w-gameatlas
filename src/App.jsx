import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import ToastProvider from './components/Toast/ToastProvider.jsx'
import AllAssetsPage from './pages/Assets/AllAssetsPage.jsx'
import AssetEditorPage from './pages/Assets/AssetEditorPage.jsx'
import AssetListPage from './pages/Assets/AssetListPage.jsx'
import AssetViewPage from './pages/Assets/AssetViewPage.jsx'
import BlueprintBuilderPage from './pages/Blueprints/BlueprintBuilderPage.jsx'
import BlueprintListPage from './pages/Blueprints/BlueprintListPage.jsx'
import DashboardPage from './pages/Dashboard/DashboardPage.jsx'
import DialogueListPage from './pages/Dialogues/DialogueListPage.jsx'
import NotFoundPage from './pages/NotFound/NotFoundPage.jsx'
import SettingsPage from './pages/Settings/SettingsPage.jsx'
import StyleShowcase from './pages/StyleShowcase/StyleShowcase.jsx'

// The dialogue editor brings in React Flow, which is large, so it's only downloaded when that page is opened
const DialogueEditorPage = lazy(() => import('./pages/Dialogues/DialogueEditorPage.jsx'))
const lazyPage = (page) => <Suspense fallback={null}>{page}</Suspense>

// Every page and its URL. (A "data router" like this one is needed for the unsaved-changes guard.)
const router = createBrowserRouter([
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
  { path: '/dev/styles', element: <StyleShowcase /> },
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
