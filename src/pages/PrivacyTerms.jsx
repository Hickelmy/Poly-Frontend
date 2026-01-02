import React from 'react';
import { Shield, FileText, Lock, Eye, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PublicNavbar from "@/components/shared/PublicNavbar";

export default function PrivacyTerms() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <PublicNavbar />
      <div className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-8 h-8" />
              Privacidade e Termos de Uso
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Entenda como protegemos seus dados e nossos termos de serviço
            </p>
          </div>

      <Tabs defaultValue="privacy" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="privacy">Política de Privacidade</TabsTrigger>
          <TabsTrigger value="terms">Termos de Uso</TabsTrigger>
        </TabsList>

        {/* Privacy Policy */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Coleta de Informações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700 dark:text-slate-300">
                Coletamos informações que você nos fornece diretamente, incluindo:
              </p>
              <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                  <span>Dados de cadastro (nome, e-mail, endereço)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                  <span>Informações de localização para mapeamento comunitário</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                  <span>Dados de transações e pagamentos</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                  <span>Conteúdo gerado (projetos, comentários, avaliações)</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Uso das Informações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 dark:text-slate-300 mb-4">
                Utilizamos suas informações para:
              </p>
              <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                <li>• Fornecer e melhorar nossos serviços</li>
                <li>• Processar transações e pagamentos</li>
                <li>• Comunicar sobre atualizações e novidades</li>
                <li>• Garantir a segurança da plataforma</li>
                <li>• Cumprir obrigações legais</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compartilhamento de Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 dark:text-slate-300">
                Não vendemos seus dados pessoais. Compartilhamos informações apenas com:
              </p>
              <ul className="space-y-2 text-slate-700 dark:text-slate-300 mt-4">
                <li>• Processadores de pagamento autorizados</li>
                <li>• Prestadores de serviços que nos auxiliam na operação</li>
                <li>• Autoridades quando exigido por lei</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seus Direitos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 dark:text-slate-300 mb-4">
                Você tem o direito de:
              </p>
              <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                <li>• Acessar seus dados pessoais</li>
                <li>• Corrigir informações incorretas</li>
                <li>• Solicitar a exclusão de seus dados</li>
                <li>• Revogar consentimento a qualquer momento</li>
                <li>• Exportar seus dados</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Segurança</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 dark:text-slate-300">
                Implementamos medidas de segurança técnicas e organizacionais para proteger 
                seus dados contra acesso não autorizado, alteração, divulgação ou destruição. 
                Todas as transações financeiras são processadas através de gateways de 
                pagamento seguros e criptografados.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Terms of Use */}
        <TabsContent value="terms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Aceitação dos Termos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 dark:text-slate-300">
                Ao acessar e usar a plataforma POLYS, você concorda em cumprir estes Termos 
                de Uso. Se você não concorda com algum destes termos, não deve usar nossa 
                plataforma.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Uso da Plataforma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                  Você concorda em:
                </h4>
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li>• Fornecer informações precisas e atualizadas</li>
                  <li>• Manter a segurança de sua conta</li>
                  <li>• Usar a plataforma apenas para fins legais</li>
                  <li>• Respeitar outros usuários e suas propriedades</li>
                  <li>• Não realizar atividades fraudulentas</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                  Você não deve:
                </h4>
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li>• Violar leis ou regulamentos</li>
                  <li>• Infringir direitos de propriedade intelectual</li>
                  <li>• Transmitir conteúdo ofensivo ou prejudicial</li>
                  <li>• Tentar acessar contas de outros usuários</li>
                  <li>• Interferir no funcionamento da plataforma</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Projetos e Financiamento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 dark:text-slate-300 mb-4">
                Ao criar ou apoiar um projeto na plataforma:
              </p>
              <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                <li>• Projetos devem ser legais e éticos</li>
                <li>• Criadores são responsáveis pelo cumprimento das metas</li>
                <li>• Doações são processadas através de escrow seguro</li>
                <li>• Reembolsos seguem nossa política de cancelamento</li>
                <li>• A plataforma cobra uma comissão de 10% sobre projetos bem-sucedidos</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Propriedade Intelectual</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 dark:text-slate-300">
                Todo o conteúdo da plataforma, incluindo design, logos, textos e software, 
                é propriedade do POLYS ou de seus licenciadores. Você não pode copiar, 
                modificar ou distribuir este conteúdo sem autorização prévia.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Limitação de Responsabilidade</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 dark:text-slate-300">
                O POLYS não se responsabiliza por danos diretos, indiretos, incidentais ou 
                consequenciais resultantes do uso ou incapacidade de usar a plataforma. 
                Fornecemos a plataforma "como está", sem garantias expressas ou implícitas.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alterações nos Termos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 dark:text-slate-300">
                Reservamos o direito de modificar estes termos a qualquer momento. 
                Alterações significativas serão comunicadas aos usuários. O uso continuado 
                da plataforma após as alterações constitui aceitação dos novos termos.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Contact */}
      <Card className="bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800">
        <CardHeader>
          <CardTitle>Dúvidas sobre Privacidade ou Termos?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 dark:text-slate-300 mb-4">
            Se você tiver dúvidas sobre nossa Política de Privacidade ou Termos de Uso, 
            entre em contato conosco através do e-mail: 
            <a href="mailto:privacidade@polys.com.br" className="text-teal-600 hover:underline ml-1">
              privacidade@polys.com.br
            </a>
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Última atualização: Janeiro de 2025
          </p>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}

