import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/sonner"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SelectedZoneProvider } from '@/contexts/SelectedZoneContext'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SelectedZoneProvider>
        <Pages />
        <Toaster />
      </SelectedZoneProvider>
    </QueryClientProvider>
  )
}

export default App