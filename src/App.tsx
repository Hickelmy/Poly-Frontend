import './App.css'
import Pages from "@/pages/index"
import { Toaster } from "@/components/ui/sonner"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SelectedZoneProvider } from '@/contexts/SelectedZoneContext'
import { CartProvider } from '@/contexts/CartContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      cacheTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      retryDelay: 1000,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SelectedZoneProvider>
        <CartProvider>
          <Pages />
          <Toaster />
        </CartProvider>
      </SelectedZoneProvider>
    </QueryClientProvider>
  )
}

export default App
