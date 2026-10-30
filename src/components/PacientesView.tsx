import React, { useState, useEffect } from 'react'
import { Paciente } from '@/types/hospital'
import { listarPacientes, criarPaciente, atualizarPaciente } from '@/services/cadastros'
import {
  buscarPacientesPaginadoNoServidor,
  validarCPFOficial,
  validarCNSOficial,
  mascararCPF,
  mascararCNS,
  analisarSuspeitaHomonimo,
  AlertaHomonimo,
  limparApenasDigitosPreservandoZeros,
} from '@/services/identificacaoPaciente'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  Search,
  UserPlus,
  Edit,
  Phone,
  MapPin,
  HeartPulse,
  Check,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const PacientesView: React.FC = () => {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [pacienteEditando, setPacienteEditando] = useState<Paciente | null>(null)

  // Paginação no servidor
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [totalItens, setTotalItens] = useState(0)
  const ITENS_POR_PAGINA = 15

  // Verificação de homônimos e avisos humanos
  const [alertaHomonimo, setAlertaHomonimo] = useState<AlertaHomonimo | null>(null)
  const [pacienteDetalhesModal, setPacienteDetalhesModal] = useState<Paciente | null>(null)

  const { toast } = useToast()

  const [formNome, setFormNome] = useState('')
  const [formCpf, setFormCpf] = useState('')
  const [formSus, setFormSus] = useState('')
  const [formDataNasc, setFormDataNasc] = useState('')
  const [formSexo, setFormSexo] = useState<'M' | 'F' | 'Outro'>('M')
  const [formNomeMae, setFormNomeMae] = useState('')
  const [formTelefone, setFormTelefone] = useState('')
  const [formEndereco, setFormEndereco] = useState('')
  const [formBairro, setFormBairro] = useState('')
  const [formCidade, setFormCidade] = useState('Mirante da Serra')
  const [formTipoSanguineo, setFormTipoSanguineo] = useState('O+')
  const [formAlergias, setFormAlergias] = useState('')
  const [formCondicoesCronicas, setFormCondicoesCronicas] = useState('')
  const [formObservacoes, setFormObservacoes] = useState('')

  useEffect(() => {
    carregarPacientes()
  }, [])

  const carregarPacientes = async (filtro?: string, pagina = 1) => {
    setLoading(true)
    try {
      const res = await buscarPacientesPaginadoNoServidor({
        termo: filtro !== undefined ? filtro : busca,
        pagina,
        porPagina: ITENS_POR_PAGINA,
      })
      setPacientes(res.itens)
      setTotalPaginas(res.totalPaginas || 1)
      setTotalItens(res.totalItens)
      setPaginaAtual(res.paginaAtual)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os pacientes do servidor.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault()
    setPaginaAtual(1)
    carregarPacientes(busca, 1)
  }

  const abrirNovoPaciente = () => {
    setPacienteEditando(null)
    setAlertaHomonimo(null)
    setFormNome('')
    setFormCpf('')
    setFormSus('')
    setFormDataNasc('')
    setFormSexo('M')
    setFormNomeMae('')
    setFormTelefone('')
    setFormEndereco('')
    setFormBairro('')
    setFormCidade('Mirante da Serra')
    setFormTipoSanguineo('O+')
    setFormAlergias('')
    setFormCondicoesCronicas('')
    setFormObservacoes('')
    setDialogAberto(true)
  }

  const abrirEditarPaciente = (p: Paciente) => {
    setPacienteEditando(p)
    setFormNome(p.nome)
    setFormCpf(p.cpf || '')
    setFormSus(p.cartao_sus)
    setFormDataNasc(p.data_nascimento || '')
    setFormSexo(p.sexo || 'M')
    setFormNomeMae(p.nome_mae || '')
    setFormTelefone(p.telefone || '')
    setFormEndereco(p.endereco || '')
    setFormBairro(p.bairro || '')
    setFormCidade(p.cidade || 'Mirante da Serra')
    setFormTipoSanguineo(p.tipo_sanguineo || 'O+')
    setFormAlergias(p.alergias || '')
    setFormCondicoesCronicas(p.condicoes_cronicas || '')
    setFormObservacoes(p.observacoes || '')
    setDialogAberto(true)
  }

  // Verificação de homônimo em tempo real ao digitar o nome
  const verificarHomonimoAoDigitar = (
    nomeDigitado: string,
    maeDigitada: string,
    dataDigitada: string,
  ) => {
    if (!nomeDigitado.trim() || nomeDigitado.trim().length < 4) {
      setAlertaHomonimo(null)
      return
    }

    const homonimoEncontrado = pacientes.find((existente) => {
      const analise = analisarSuspeitaHomonimo(
        {
          nome: nomeDigitado,
          nomeMae: maeDigitada,
          dataNascimento: dataDigitada,
          id: pacienteEditando?.id,
        },
        existente,
      )
      return analise.suspeita
    })

    if (homonimoEncontrado) {
      const resultado = analisarSuspeitaHomonimo(
        {
          nome: nomeDigitado,
          nomeMae: maeDigitada,
          dataNascimento: dataDigitada,
          id: pacienteEditando?.id,
        },
        homonimoEncontrado,
      )
      setAlertaHomonimo(resultado)
    } else {
      setAlertaHomonimo(null)
    }
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formNome.trim()) {
      toast({
        title: 'Atenção',
        description: 'Nome completo do paciente é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    // Validações Oficiais (CPF / CNS)
    // Preserva zeros à esquerda e valida dígitos oficiais
    const cpfLimpo = limparApenasDigitosPreservandoZeros(formCpf)
    if (cpfLimpo) {
      const valCpf = validarCPFOficial(cpfLimpo, false)
      if (!valCpf.valido) {
        toast({
          title: 'CPF Inválido',
          description: valCpf.motivo,
          variant: 'destructive',
        })
        return
      }
    }

    const cnsLimpo = limparApenasDigitosPreservandoZeros(formSus)
    if (cnsLimpo) {
      const valCns = validarCNSOficial(cnsLimpo, false)
      if (!valCns.valido) {
        toast({
          title: 'Cartão SUS Inválido',
          description: valCns.motivo,
          variant: 'destructive',
        })
        return
      }
    }

    setSalvando(true)
    try {
      const dados: Partial<Paciente> = {
        nome: formNome.trim(),
        cpf: cpfLimpo || undefined,
        cartao_sus: cnsLimpo || formSus.trim(),
        data_nascimento: formDataNasc,
        sexo: formSexo,
        nome_mae: formNomeMae.trim(),
        telefone: formTelefone.trim(),
        endereco: formEndereco.trim(),
        bairro: formBairro.trim(),
        cidade: formCidade.trim(),
        tipo_sanguineo: formTipoSanguineo,
        alergias: formAlergias.trim(),
        condicoes_cronicas: formCondicoesCronicas.trim(),
        observacoes: formObservacoes.trim(),
      }

      if (pacienteEditando) {
        await atualizarPaciente(pacienteEditando.id, dados)
        toast({ title: 'Sucesso', description: 'Paciente atualizado com sucesso!' })
      } else {
        await criarPaciente(dados)
        toast({ title: 'Sucesso', description: 'Paciente cadastrado com sucesso!' })
      }

      setDialogAberto(false)
      carregarPacientes(busca, paginaAtual)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Falha ao gravar no banco.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Cadastro de Pacientes (SUS)
          </h1>
          <p className="text-xs text-slate-500">
            Registro civil, Cartão Nacional de Saúde (CNS), contato e prontuário básico
          </p>
        </div>
        <Button
          onClick={abrirNovoPaciente}
          className="bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Paciente
        </Button>
      </div>

      {/* Barra de Busca */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <form onSubmit={handleBuscar} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome, CPF ou número do Cartão SUS..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <Button type="submit" variant="secondary" className="text-sm">
              Filtrar
            </Button>
            {busca && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBusca('')
                  carregarPacientes('')
                }}
                className="text-sm"
              >
                Limpar
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Lista de Pacientes */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-800">
              Pacientes Cadastrados ({totalItens} no servidor)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Busca paginada • Privacidade LGPD (CPF e Cartão SUS mascarados na listagem pública)
            </CardDescription>
          </div>
          <div className="text-xs text-slate-500">
            Página {paginaAtual} de {totalPaginas}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center items-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              Carregando registros de pacientes do servidor...
            </div>
          ) : pacientes.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Nenhum paciente encontrado. Clique em "Novo Paciente" para cadastrar.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="divide-y divide-slate-100">
                {pacientes.map((p) => (
                  <div
                    key={p.id}
                    className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/60 p-2 rounded-lg transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm uppercase">
                          {p.nome}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[11px] bg-blue-50 text-blue-700 border-blue-200"
                        >
                          CNS: {mascararCNS(p.cartao_sus)}
                        </Badge>
                        {p.cpf ? (
                          <span className="text-xs text-slate-500 font-mono">
                            CPF: {mascararCPF(p.cpf)}
                          </span>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-50 text-amber-800 border-amber-200"
                          >
                            Sem CPF (RN/Urgência)
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px]">
                          {p.sexo === 'M' ? 'Masc' : p.sexo === 'F' ? 'Fem' : 'Outro'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                        {p.data_nascimento && <span>Nascimento: {p.data_nascimento}</span>}
                        {p.nome_mae && <span>Mãe: {p.nome_mae}</span>}
                        {p.telefone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" /> {p.telefone}
                          </span>
                        )}
                        {p.endereco && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" /> {p.endereco},{' '}
                            {p.bairro || ''} ({p.cidade || ''})
                          </span>
                        )}
                        {p.tipo_sanguineo && (
                          <span className="flex items-center gap-1 text-red-600 font-medium">
                            <HeartPulse className="w-3 h-3" /> Tipo: {p.tipo_sanguineo}
                          </span>
                        )}
                      </div>
                      {p.alergias && (
                        <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />
                          <strong>Alergias:</strong> {p.alergias}
                        </p>
                      )}
                      {p.condicoes_cronicas && (
                        <p className="text-xs text-purple-700">
                          <strong>Condições:</strong> {p.condicoes_cronicas}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPacienteDetalhesModal(p)}
                        className="text-xs h-8 text-blue-600 hover:bg-blue-50"
                      >
                        Ver Completo
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirEditarPaciente(p)}
                        className="text-xs h-8"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1 text-slate-600" />
                        Editar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Controles de Paginação */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaAtual <= 1}
                    onClick={() => {
                      const nova = paginaAtual - 1
                      setPaginaAtual(nova)
                      carregarPacientes(busca, nova)
                    }}
                    className="text-xs"
                  >
                    Anterior
                  </Button>
                  <span className="text-xs text-slate-600">
                    Página {paginaAtual} de {totalPaginas}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaAtual >= totalPaginas}
                    onClick={() => {
                      const nova = paginaAtual + 1
                      setPaginaAtual(nova)
                      carregarPacientes(busca, nova)
                    }}
                    className="text-xs"
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Cadastro / Edição */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {pacienteEditando ? 'Editar Paciente' : 'Cadastrar Novo Paciente'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Dados obrigatórios para identificação no SUS e abertura de prontuário
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="nome" className="text-xs">
                  Nome Completo *
                </Label>
                <Input
                  id="nome"
                  required
                  placeholder="Nome completo do paciente"
                  value={formNome}
                  onChange={(e) => {
                    const novoNome = e.target.value
                    setFormNome(novoNome)
                    verificarHomonimoAoDigitar(novoNome, formNomeMae, formDataNasc)
                  }}
                  className="text-sm"
                />
                {alertaHomonimo && alertaHomonimo.suspeita && (
                  <div className="p-2.5 rounded-lg border-2 border-amber-400 bg-amber-50 text-amber-900 text-xs space-y-1 mt-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800">
                      ⚠️ Alerta Humano de Homônimo (Sem Mesclagem Automática):
                    </div>
                    <div>{alertaHomonimo.mensagem}</div>
                    <div className="text-[11px] text-amber-700 font-medium">
                      Nota: O sistema não junta cadastros automaticamente. Cadastre com documentos
                      distintos se forem pessoas diferentes.
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="sus" className="text-xs">
                  Cartão Nacional de Saúde (SUS) *
                </Label>
                <Input
                  id="sus"
                  required
                  placeholder="15 dígitos numéricos"
                  value={formSus}
                  onChange={(e) => setFormSus(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cpf" className="text-xs">
                  CPF
                </Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={formCpf}
                  onChange={(e) => setFormCpf(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="dataNasc" className="text-xs">
                  Data de Nascimento
                </Label>
                <Input
                  id="dataNasc"
                  type="date"
                  value={formDataNasc}
                  onChange={(e) => setFormDataNasc(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Sexo</Label>
                <Select value={formSexo} onValueChange={(val: any) => setFormSexo(val)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="nomeMae" className="text-xs">
                  Nome da Mãe
                </Label>
                <Input
                  id="nomeMae"
                  placeholder="Nome completo da genitora"
                  value={formNomeMae}
                  onChange={(e) => setFormNomeMae(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="telefone" className="text-xs">
                  Telefone / WhatsApp
                </Label>
                <Input
                  id="telefone"
                  placeholder="(69) 90000-0000"
                  value={formTelefone}
                  onChange={(e) => setFormTelefone(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tipo Sanguíneo</Label>
                <Select
                  value={formTipoSanguineo}
                  onValueChange={(val) => setFormTipoSanguineo(val)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="endereco" className="text-xs">
                  Endereço Residencial
                </Label>
                <Input
                  id="endereco"
                  placeholder="Rua, número, complemento"
                  value={formEndereco}
                  onChange={(e) => setFormEndereco(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="bairro" className="text-xs">
                  Bairro / Setor / Linha
                </Label>
                <Input
                  id="bairro"
                  placeholder="Ex: Centro ou Linha 64"
                  value={formBairro}
                  onChange={(e) => setFormBairro(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cidade" className="text-xs">
                  Município
                </Label>
                <Input
                  id="cidade"
                  value={formCidade}
                  onChange={(e) => setFormCidade(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label
                  htmlFor="alergias"
                  className="text-xs text-red-700 font-bold flex items-center gap-1"
                >
                  <span className="w-2 h-2 rounded-full bg-red-600 inline-block" /> Alergias
                  Conhecidas (Medicamentosas, Alimentares)
                </Label>
                <Input
                  id="alergias"
                  placeholder="Ex: Penicilina, Dipirona, AINEs, Frutos do Mar..."
                  value={formAlergias}
                  onChange={(e) => setFormAlergias(e.target.value)}
                  className="text-sm border-red-300 bg-red-50/40"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label
                  htmlFor="condicoesCronicas"
                  className="text-xs text-purple-800 font-semibold"
                >
                  Condições Crônicas / Comorbidades
                </Label>
                <Input
                  id="condicoesCronicas"
                  placeholder="Ex: Hipertensão Arterial (HAS), Diabetes Mellitus tipo 2, Asma..."
                  value={formCondicoesCronicas}
                  onChange={(e) => setFormCondicoesCronicas(e.target.value)}
                  className="text-sm border-purple-200 bg-purple-50/40"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="observacoes" className="text-xs">
                  Observações Clínicas / Histórico
                </Label>
                <Input
                  id="observacoes"
                  placeholder="Ex: Hipertenso crônico, diabético..."
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogAberto(false)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando} className="bg-blue-600 hover:bg-blue-500">
                {salvando ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                  </span>
                ) : (
                  'Salvar Paciente'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Registro Detalhado (Exibição Completa Autorizada do Prontuário do Paciente) */}
      <Dialog
        open={Boolean(pacienteDetalhesModal)}
        onOpenChange={(aberto) => !aberto && setPacienteDetalhesModal(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Registro Completo do Paciente (Identificação Oficial)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Exibição detalhada para conferência cadastral no atendimento hospitalar.
            </DialogDescription>
          </DialogHeader>

          {pacienteDetalhesModal && (
            <div className="space-y-3 pt-2 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Nome Completo:
                  </span>
                  <span className="text-slate-900 font-bold text-sm uppercase">
                    {pacienteDetalhesModal.nome}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">
                      Cartão SUS (CNS Completo):
                    </span>
                    <span className="font-mono text-emerald-800 font-bold">
                      {pacienteDetalhesModal.cartao_sus}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">
                      CPF Completo:
                    </span>
                    <span className="font-mono text-slate-800 font-bold">
                      {pacienteDetalhesModal.cpf || 'Não informado (RN/Urgência)'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">
                      Data de Nascimento:
                    </span>
                    <span>{pacienteDetalhesModal.data_nascimento || 'Não informada'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">
                      Sexo / Tipo Sang.:
                    </span>
                    <span>
                      {pacienteDetalhesModal.sexo} • {pacienteDetalhesModal.tipo_sanguineo}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Nome da Mãe:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {pacienteDetalhesModal.nome_mae || 'Não informado'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Endereço e Contato:
                  </span>
                  <span>
                    {pacienteDetalhesModal.endereco || 'Endereço não cadastrado'} —{' '}
                    {pacienteDetalhesModal.telefone || 'Sem telefone'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPacienteDetalhesModal(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
