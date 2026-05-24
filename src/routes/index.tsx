import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AuthGuard from "./AuthGuard";
import MainLayout from "@/layouts/MainLayout";
import SubPageLayout from "@/layouts/SubPageLayout";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";
import Library from "@/pages/Library";
import ExerciseForm from "@/components/exercises/ExerciseForm";
import RoutineForm from "@/components/routines/RoutineForm";
import Workout from "@/pages/Workout";
import History from "@/pages/History";
import { WorkoutDetailPage } from "@/components/history/WorkoutDetailPage";
import Settings from "@/pages/Settings";
import AppearanceSettings from "@/components/settings/AppearanceSettings";
import BodyMetricsSettings from "@/components/settings/BodyMetricsSettings";
import SyncSettings from "@/components/settings/SyncSettings";
import XPLevelsSettings from "@/components/settings/XPLevelsSettings";


const router = createBrowserRouter(
  [
    {
      element: <AuthGuard />,
      children: [
        {
          path: "/login",
          element: <Login />,
        },
        {
          path: "/onboarding",
          element: <Onboarding />,
        },
        {
          path: "/",
          element: <MainLayout />,
          children: [
            { index: true, element: <Dashboard /> },
            { path: "library", element: <Library /> },
            { path: "settings", element: <Settings /> },
          ],
        },
        {
          path: "/library",
          element: <SubPageLayout />,
          children: [
            {
              path: "exercise/create",
              element: <ExerciseForm />,
              handle: { title: "Create Movement" },
            },
            {
              path: "exercise/:id",
              element: <ExerciseForm />,
              handle: { title: "Movement Details" },
            },
            {
              path: "routine/create",
              element: <RoutineForm />,
              handle: { title: "Create Routine" },
            },
            {
              path: "routine/:id",
              element: <RoutineForm />,
              handle: { title: "Edit Routine Flow" },
            },
          ],
        },
        /* WORKOUT PATH ENGINE INJECTION CHECKPOINT */
        {
          path: "/workout",
          element: <SubPageLayout />,
          children: [
            {
              index: true,
              element: <Workout />,
              handle: { title: "Workout" },
            },
          ],
        },
        /* HISTORY LOGBOOK PATH ENGINE SUB-LAYOUT INJECTION */
        {
          path: "/history",
          element: <SubPageLayout />,
          children: [
            {
              index: true,
              element: <History />,
              handle: { title: "Logbook" },
            },
            {
              path: ":id",
              element: <WorkoutDetailPage />,
              handle: { title: "Workout Details" },
            },
          ],
        },
        /* SETTINGS SUB-PAGES */
        {
          path: "/settings",
          element: <SubPageLayout />,
          children: [
            {
              path: "appearance",
              element: <AppearanceSettings />,
              handle: { title: "Appearance" },
            },
            {
              path: "body-metrics",
              element: <BodyMetricsSettings />,
              handle: { title: "Body Metrics" },
            },
            {
              path: "xp-levels",
              element: <XPLevelsSettings />,
              handle: { title: "XP & Levels" },
            },
            {
              path: "sync",
              element: <SyncSettings />,
              handle: { title: "Sync Status" },
            },
          ],
        },
      ],
    },
  ],
  {
    basename: "/fittrack",
  },
);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}