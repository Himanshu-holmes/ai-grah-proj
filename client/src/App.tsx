import PlanetChat from "./components/chat";
import { Toaster } from "@/components/ui/sonner";
function App() {


  return (
    <>
      <main className="min-h-screen min-w-screen bg-gray-100">
        <PlanetChat />
      </main>
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App
