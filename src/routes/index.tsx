import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AuthGuard from "./AuthGuard";
import MainLayout from "@/layouts/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";

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
          element: <MainLayout />, // Dashboard and sub-pages live here
          children: [
            { index: true, element: <Dashboard /> },
            { path: "workout", element: <div>Workout Page</div> },
            { path: "history", element: <div>History Page</div> },
            { path: "settings", element: <div>Settings Page</div> },
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
