import { QueryClient } from "@tanstack/react-query";
import { createHashHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    // Use a plain hash history; Vite base already handles the /rhof prefix.
    history: typeof document === "undefined" ? undefined : createHashHistory(),
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
