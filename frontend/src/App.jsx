import { lazy, Suspense, useEffect } from 'react'
import {createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation, useParams} from 'react-router'
import MissingRecord from './components/MissingRecord/MissingRecord.jsx'
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
import ProjectSettingsPage from './pages/Projects/ProjectSettingsPage.jsx'
import SettingsPage from './pages/Settings/SettingsPage.jsx'
import {rememberProject} from './api/currentProjectStore.js'
import {useCurrentProject} from './api/useCurrentProject.js'
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

/**
 * Wraps every page about one project's data (/projects/:projectId/…): "Project not found" when the URL's project
 * isn't one of the user's, and otherwise remembers it as the last project visited.
 */
function RequireProject() {
  const currentProject = useCurrentProject()
  const { projectId } = useParams()

  let foundId = null
  if (currentProject.project) {
    foundId = currentProject.project.id
  }
  useEffect(() => {
    if (foundId) {
      rememberProject(foundId)
    }
  }, [foundId])

  if (currentProject.missing) {
    return (
      <MissingRecord
        title="Project not found"
        message="This project doesn't exist, or you aren't one of its members."
        back={{ to: '/', label: 'Go home' }}
      />
    )
  }
  // React Router keeps a page mounted when only its URL's ID changes. The key makes another project start fresh
  // pages, so nothing typed or filtered in one project carries over to the next.
  return <Outlet key={projectId} />
}

const router = createBrowserRouter([
  {
    element: <RequireLogin />,
    children: [
      { path: '/', element: <DashboardPage /> },
      {
        element: <RequireProject />,
        // Full paths with no page at /projects or /projects/:projectId, so those two are still "not found"
        children: [
          { path: '/projects/:projectId/assets', element: <AllAssetsPage /> },
          { path: '/projects/:projectId/blueprints', element: <BlueprintListPage /> },
          { path: '/projects/:projectId/blueprints/new', element: <BlueprintBuilderPage /> },
          { path: '/projects/:projectId/blueprints/:blueprintId', element: <BlueprintBuilderPage /> },
          { path: '/projects/:projectId/blueprints/:blueprintId/assets', element: <AssetListPage /> },
          { path: '/projects/:projectId/blueprints/:blueprintId/assets/new', element: <AssetEditorPage /> },
          { path: '/projects/:projectId/blueprints/:blueprintId/assets/:assetKey', element: <AssetViewPage /> },
          { path: '/projects/:projectId/blueprints/:blueprintId/assets/:assetKey/edit', element: <AssetEditorPage /> },
          { path: '/projects/:projectId/dialogues', element: <DialogueListPage /> },
          { path: '/projects/:projectId/dialogues/new', element: lazyPage(<DialogueEditorPage />) },
          { path: '/projects/:projectId/dialogues/:dialogueKey', element: lazyPage(<DialogueEditorPage />) },
          { path: '/projects/:projectId/settings', element: <ProjectSettingsPage /> },
        ],
      },
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
