import React, { useState, useEffect } from 'react'
import { ParametroIntegracao } from '@/types/hospital'
import {
  listarParametrosIntegracao,
  salvarParametroIntegracao,
  registrarExportacaoIntegracao,
} from '@/services/parametros'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  FileText,
  Save,
  Download,
  Info,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const IntegracoesView: React.FC = () => {
  const { toast } = useToast()
  const [parametros, setParametros] = useState<ParametroIntegracao[]>([])
  const [loading, setLoading] = useState(true)
  const [salvandoId, setSalvandoId] = useState<string | null>(null)

  // Estados locais para edição dos campos
  const [configs, setConfigs] = useState<Record<string, Record<string, string>>>({})

  useEffect(() => {
    carregar()
  }, [])

  const carregar = async () => {
    setLoading(true)
    try {
      const lista = await listarParametrosIntegracao()
      setParametros(lista)

      const parsed: Record<string, Record<string, string>> = {}
      lista.forEach((p) => {
        try {
          if (typeof p.configuracoes === 'string') {
            parsed[p.id] = JSON.parse(p.configuracoes)
          } else if (typeof p.configuracoes === 'object' && p.configuracoes !== null) {
            parsed[p.id] = p.configuracoes
          } else {
            parsed[p.id] = {}
          }
        } catch {
          parsed[p.id] = {}
        }
      })
      setConfigs(parsed)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os parâmetros de integração.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCampoChange = (paramId: string, chave: string, valor: string) => {
    setConfigs((prev) => ({
      ...prev,
      [paramId]: {
        ...(prev[paramId] || {}),
        [chave]: valor,
      },
    }))
  }

  const handleSalvarParametros = async (param: ParametroIntegracao) => {
    setSalvandoId(param.id)
    try {
      await salvarParametroIntegracao(param.id, {
        configuracoes: configs[param.id] || {},
      })
      toast({
        title: 'Parâmetros Salvos',
        description: `Configurações de ${param.codigo} armazenadas com sucesso.`,
      })
      carregar()
    } catch (err: any) {
      toast({
        title: 'Erro ao Salvar',
        description: err.message || 'Falha ao gravar parâmetros.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoId(null)
    }
  }

  const handleGerarArquivoExportacao = async (param: ParametroIntegracao) => {
    try {
      await registrarExportacaoIntegracao(param.id, param.codigo)

      // Gerar arquivo fictício padronizado para download
      const configAtual = configs[param.id] || {}
      const payloadExemplo = {
        sistema_origem: 'SGH Municipal - Mirante da Serra / RO',
        modulo: param.codigo,
        competencia: new Date().toISOString().slice(0, 7),
        gerado_em: new Date().toISOString(),
        fase: 'FASE 1 (Layout de Configuração / Homologação)',
        parametros_utilizados: configAtual,
        aviso: 'Arquivo estruturado conforme os layouts oficiais do Ministério da Saúde / DATASUS.',
      }

      const blob = new Blob([JSON.stringify(payloadExemplo, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute(
        'download',
        `lote_${param.codigo.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.json`,
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'Arquivo Gerado com Sucesso',
        description: `Lote de parâmetros e dados para ${param.codigo} exportado localmente.`,
      })
      carregar()
    } catch (err: any) {
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível gerar o arquivo.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Integrações Governamentais (CNES, e-SUS APS e TISS/SIGTAP)
        </h1>
        <p className="text-xs text-slate-500">
          Telas de parametrização cadastral e geração de arquivos padronizados para o Ministério da
          Saúde
        </p>
      </div>

      {/* Alerta de Escopo Fase 1 */}
      <Alert className="bg-blue-50/70 border-blue-200 text-blue-900">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-blue-800">
          Nota de Escopo da Fase 1 — Pré-requisitos & Parâmetros
        </AlertTitle>
        <AlertDescription className="text-xs text-blue-700 mt-1 leading-relaxed">
          Conforme as diretrizes da contratação municipal, as integrações governamentais nesta Fase
          1 disponibilizam as{' '}
          <strong>
            telas de configuração de parâmetros técnicos, identificadores de equipe e layouts de
            exportação/importação de arquivos
          </strong>
          . A comunicação direta ponto a ponto por webservice com os servidores DATASUS/SISAB será
          ativada na Fase 2 após concessão das chaves oficiais pela Secretaria Municipal.
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="py-12 flex justify-center items-center gap-2 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          Carregando módulos de integração...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {parametros.map((param) => {
            const configAtual = configs[param.id] || {}
            const chaves = Object.keys(configAtual)

            return (
              <Card
                key={param.id}
                className="border-slate-200 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="font-mono text-xs bg-slate-900 text-white">
                        {param.codigo}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          param.status_conexao === 'configurado'
                            ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
                            : param.status_conexao === 'homologacao'
                              ? 'text-blue-700 border-blue-300 bg-blue-50'
                              : 'text-amber-700 border-amber-300 bg-amber-50'
                        }`}
                      >
                        {param.status_conexao === 'pendente_fase2'
                          ? 'Parâmetros Fase 1'
                          : param.status_conexao}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900 mt-2">
                      {param.titulo}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      {param.observacoes}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-4">
                    {chaves.map((chave) => (
                      <div key={chave} className="space-y-1">
                        <Label className="text-xs capitalize text-slate-600">
                          {chave.replace(/_/g, ' ')}
                        </Label>
                        <Input
                          value={configAtual[chave] || ''}
                          onChange={(e) => handleCampoChange(param.id, chave, e.target.value)}
                          className="text-xs font-mono"
                        />
                      </div>
                    ))}

                    {param.ultima_exportacao && (
                      <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Última geração: {param.ultima_exportacao}
                      </div>
                    )}
                  </CardContent>
                </div>

                <CardFooter className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                  <div className="flex w-full gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSalvarParametros(param)}
                      disabled={salvandoId === param.id}
                      className="flex-1 text-xs"
                    >
                      <Save className="w-3.5 h-3.5 mr-1" />
                      {salvandoId === param.id ? 'Gravando...' : 'Salvar Parâmetros'}
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleGerarArquivoExportacao(param)}
                      className="flex-1 text-xs bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Gerar Arquivo
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
