import { createHashRouter, RouterProvider } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import Dashboard from "@/pages/Dashboard";

// Placeholders for routes we haven't built yet
const Placeholder = ({ title }: { title: string }) => (
  <div className="p-6 text-zinc-500 font-mono text-sm">
    {title} Page (Coming Soon)
  </div>
);

const router = createHashRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "workout",
        element: <Placeholder title="Workout" />,
      },
      {
        path: "history",
        element: <Placeholder title="History" />,
      },
      {
        path: "settings",
        element: <Placeholder title="Settings" />,
      },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
