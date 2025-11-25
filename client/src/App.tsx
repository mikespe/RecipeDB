import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FavoritesProvider } from "@/hooks/useFavorites";
import Home from "@/pages/home";
import RecipeDetail from "@/pages/recipe-detail";
import Favorites from "@/pages/favorites";
import YouTubeSetup from "@/pages/youtube-setup";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/recipe/:id" component={RecipeDetail} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/admin/youtube-setup" component={YouTubeSetup} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FavoritesProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </FavoritesProvider>
    </QueryClientProvider>
  );
}

export default App;
