import React, { useState, useEffect } from 'react'
import { Paciente } from '@/types/hospital'
import { listarPacientes, criarPaciente, atualizarPaciente } from '@/services/cadastros'
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

  const carregarPacientes = async (filtro?: string) => {
    setLoading(true)
    try {
      const lista = await listarPacientes(filtro)
      setPacientes(lista)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os pacientes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault()
    carregarPacientes(busca)
  }

  const abrirNovoPaciente = () => {
    setPacienteEditando(null)
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

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNome.trim() || !formSus.trim()) {
      toast({
        title: 'Atenção',
        description: 'Nome e Cartão SUS são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const dados: Partial<Paciente> = {
        nome: formNome.trim(),
        cpf: formCpf.trim(),
        cartao_sus: formSus.trim(),
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
      carregarPacientes(busca)
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
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">
            Pacientes Cadastrados ({pacientes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center items-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              Carregando registros de pacientes...
            </div>
          ) : pacientes.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Nenhum paciente encontrado. Clique em "Novo Paciente" para cadastrar.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pacientes.map((p) => (
                <div
                  key={p.id}
                  className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{p.nome}</span>
                      <Badge
                        variant="outline"
                        className="text-[11px] bg-blue-50 text-blue-700 border-blue-200"
                      >
                        SUS: {p.cartao_sus}
                      </Badge>
                      {p.cpf && (
                        <span className="text-xs text-slate-500 font-mono">CPF: {p.cpf}</span>
                      )}
                      <Badge variant="secondary" className="text-[10px]">
                        {p.sexo === 'M' ? 'Masc' : p.sexo === 'F' ? 'Fem' : 'Outro'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                      {p.data_nascimento && <span>Nascimento: {p.data_nascimento}</span>}
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
                    )}{' '}
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
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
                  onChange={(e) => setFormNome(e.target.value)}
                  className="text-sm"
                />
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
    </div>
  )
}
