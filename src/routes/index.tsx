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
import { Settings } from "@/pages/Settings";

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
              handle: { title: "Create Movement" }, // Defined explicitly per page details
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
          element: <SubPageLayout />, // Reuses your clean top bar layout back-button shell
          children: [
            {
              index: true,
              element: <Workout />,
              handle: { title: "Workout" }, // Automatically sets title without path metadata strings
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
              path: ":id", // ← add this
              element: <WorkoutDetailPage />,
              handle: { title: "Workout Details" },
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
