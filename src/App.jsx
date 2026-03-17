import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/sonner"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SelectedZoneProvider } from '@/contexts/SelectedZoneContext'
import { CartProvider } from '@/contexts/CartContext'

// Configuração otimizada do QueryClient para melhor performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados são considerados "fresh" por 1 minuto (não refetch automático)
      staleTime: 60 * 1000, // 1 minuto
      // Dados ficam em cache por 5 minutos
      cacheTime: 5 * 60 * 1000, // 5 minutos
      // Não refetch automaticamente ao focar na janela
      refetchOnWindowFocus: false,
      // Não refetch ao reconectar
      refetchOnReconnect: false,
      // Retry apenas 1 vez em caso de erro
      retry: 1,
      // Tempo entre retries
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