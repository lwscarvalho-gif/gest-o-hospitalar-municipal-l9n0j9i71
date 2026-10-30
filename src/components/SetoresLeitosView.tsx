import React, { useState, useEffect } from 'react'
import { Setor, Leito } from '@/types/hospital'
import {
  listarSetores,
  criarSetor,
  atualizarSetor,
  listarLeitos,
  criarLeito,
  atualizarLeito,
  excluirLeito,
} from '@/services/cadastros'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Bed, Plus, Edit, Trash2, Hospital, Loader2, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const SetoresLeitosView: React.FC = () => {
  const [setores, setSetores] = useState<Setor[]>([])
  const [leitos, setLeitos] = useState<Leito[]>([])
  const [loading, setLoading] = useState(true)

  const { toast } = useToast()

  // Dialog Setor
  const [dialogSetorAberto, setDialogSetorAberto] = useState(false)
  const [setorEditando, setSetorEditando] = useState<Setor | null>(null)
  const [formSetorNome, setFormSetorNome] = useState('')
  const [formSetorSigla, setFormSetorSigla] = useState('')
  const [formSetorTipo, setFormSetorTipo] = useState<
    'enfermaria' | 'uti' | 'isolamento' | 'pronto_socorro' | 'centro_cirurgico' | 'ambulatorio'
  >('enfermaria')
  const [formSetorCapacidade, setFormSetorCapacidade] = useState<number>(10)
  const [formSetorDescricao, setFormSetorDescricao] = useState('')

  // Dialog Leito
  const [dialogLeitoAberto, setDialogLeitoAberto] = useState(false)
  const [leitoEditando, setLeitoEditando] = useState<Leito | null>(null)
  const [formLeitoCodigo, setFormLeitoCodigo] = useState('')
  const [formLeitoSetor, setFormLeitoSetor] = useState('')
  const [formLeitoTipo, setFormLeitoTipo] = useState<
    'clinico' | 'cirurgico' | 'pediatrico' | 'uti' | 'isolamento'
  >('clinico')
  const [formLeitoStatus, setFormLeitoStatus] = useState<
    'vago' | 'ocupado' | 'manutencao' | 'higienizacao'
  >('vago')
  const [formLeitoObs, setFormLeitoObs] = useState('')

  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregar()
  }, [])

  const carregar = async () => {
    setLoading(true)
    try {
      const [s, l] = await Promise.all([listarSetores(), listarLeitos()])
      setSetores(s)
      setLeitos(l)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar setores e leitos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const abrirNovoSetor = () => {
    setSetorEditando(null)
    setFormSetorNome('')
    setFormSetorSigla('')
    setFormSetorTipo('enfermaria')
    setFormSetorCapacidade(10)
    setFormSetorDescricao('')
    setDialogSetorAberto(true)
  }

  const abrirEditarSetor = (s: Setor) => {
    setSetorEditando(s)
    setFormSetorNome(s.nome)
    setFormSetorSigla(s.sigla || '')
    setFormSetorTipo(s.tipo)
    setFormSetorCapacidade(s.capacidade || 0)
    setFormSetorDescricao(s.descricao || '')
    setDialogSetorAberto(true)
  }

  const handleSalvarSetor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formSetorNome.trim()) {
      toast({
        title: 'Atenção',
        description: 'Nome do setor é obrigatório.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      const dados: Partial<Setor> = {
        nome: formSetorNome.trim(),
        sigla: formSetorSigla.trim(),
        tipo: formSetorTipo,
        capacidade: Number(formSetorCapacidade),
        descricao: formSetorDescricao.trim(),
        ativo: true,
      }

      if (setorEditando) {
        await atualizarSetor(setorEditando.id, dados)
        toast({ title: 'Sucesso', description: 'Setor atualizado!' })
      } else {
        await criarSetor(dados)
        toast({ title: 'Sucesso', description: 'Setor cadastrado!' })
      }
      setDialogSetorAberto(false)
      carregar()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao salvar setor.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const abrirNovoLeito = () => {
    setLeitoEditando(null)
    setFormLeitoCodigo('')
    setFormLeitoSetor(setores[0]?.id || '')
    setFormLeitoTipo('clinico')
    setFormLeitoStatus('vago')
    setFormLeitoObs('')
    setDialogLeitoAberto(true)
  }

  const abrirEditarLeito = (l: Leito) => {
    setLeitoEditando(l)
    setFormLeitoCodigo(l.codigo)
    setFormLeitoSetor(l.setor)
    setFormLeitoTipo(l.tipo)
    setFormLeitoStatus(l.status)
    setFormLeitoObs(l.observacoes || '')
    setDialogLeitoAberto(true)
  }

  const handleSalvarLeito = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formLeitoCodigo.trim() || !formLeitoSetor) {
      toast({
        title: 'Atenção',
        description: 'Código do leito e setor são obrigatórios.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      const dados: Partial<Leito> = {
        codigo: formLeitoCodigo.trim().toUpperCase(),
        setor: formLeitoSetor,
        tipo: formLeitoTipo,
        status: formLeitoStatus,
        observacoes: formLeitoObs.trim(),
      }

      if (leitoEditando) {
        await atualizarLeito(leitoEditando.id, dados)
        toast({ title: 'Sucesso', description: 'Leito atualizado!' })
      } else {
        await criarLeito(dados)
        toast({ title: 'Sucesso', description: 'Leito cadastrado!' })
      }
      setDialogLeitoAberto(false)
      carregar()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao salvar leito.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluirLeito = async (l: Leito) => {
    if (l.status === 'ocupado') {
      toast({
        title: 'Bloqueado',
        description: 'Não é possível excluir um leito ocupado por paciente.',
        variant: 'destructive',
      })
      return
    }
    if (window.confirm(`Tem certeza que deseja excluir o leito ${l.codigo}?`)) {
      try {
        await excluirLeito(l.id, l.codigo)
        toast({ title: 'Excluído', description: 'Leito removido.' })
        carregar()
      } catch (err: any) {
        toast({ title: 'Erro', description: 'Falha ao remover leito.', variant: 'destructive' })
      }
    }
  }

  const statusBadge = (st: string) => {
    switch (st) {
      case 'vago':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
            Vago / Disponível
          </Badge>
        )
      case 'ocupado':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Ocupado</Badge>
      case 'manutencao':
        return <Badge className="bg-slate-200 text-slate-800 border-slate-300">Em Manutenção</Badge>
      case 'higienizacao':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300">
            Higienização Terminal
          </Badge>
        )
      default:
        return <Badge variant="outline">{st}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Hospital className="w-5 h-5 text-blue-600" />
            Setores Hospitalares & Leitos
          </h1>
          <p className="text-xs text-slate-500">
            Parametrização de unidades de internação, enfermarias, UTI e inventário de leitos
          </p>
        </div>
      </div>

      <Tabs defaultValue="leitos" className="w-full">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="leitos" className="text-xs sm:text-sm">
            Inventário de Leitos ({leitos.length})
          </TabsTrigger>
          <TabsTrigger value="setores" className="text-xs sm:text-sm">
            Unidades e Setores ({setores.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB LEITOS */}
        <TabsContent value="leitos" className="space-y-4 pt-2">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">
              Gerencie os códigos, tipos e status operacionais dos leitos
            </p>
            <Button
              onClick={abrirNovoLeito}
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Novo Leito
            </Button>
          </div>

          <Card className="border-slate-200">
            <CardContent className="p-0">
              {loading ? (
                <div className="py-12 flex justify-center items-center gap-2 text-slate-500 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> Carregando leitos...
                </div>
              ) : leitos.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  Nenhum leito cadastrado.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {leitos.map((l) => (
                    <div
                      key={l.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-base">{l.codigo}</span>
                          {statusBadge(l.status)}
                          <Badge variant="outline" className="text-xs">
                            {l.expand?.setor?.nome || 'Setor'}
                          </Badge>
                          <Badge variant="secondary" className="text-xs uppercase">
                            {l.tipo}
                          </Badge>
                        </div>
                        {l.observacoes && (
                          <p className="text-xs text-slate-500">
                            <strong>Obs:</strong> {l.observacoes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirEditarLeito(l)}
                          className="text-xs h-8"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1 text-slate-600" /> Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={l.status === 'ocupado'}
                          onClick={() => handleExcluirLeito(l)}
                          className="text-xs h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB SETORES */}
        <TabsContent value="setores" className="space-y-4 pt-2">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">
              Unidades físicas e departamentos assistenciais do município
            </p>
            <Button
              onClick={abrirNovoSetor}
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Novo Setor
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {setores.map((s) => {
              const leitosDesteSetor = leitos.filter((l) => l.setor === s.id)
              return (
                <Card key={s.id} className="border-slate-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-bold text-slate-900">{s.nome}</CardTitle>
                      {s.sigla && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {s.sigla}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs capitalize">
                      Tipo: {s.tipo.replace('_', ' ')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-1">
                    <p className="text-xs text-slate-600 min-h-[32px]">
                      {s.descricao || 'Sem descrição cadastrada.'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <span>
                        Capacidade oficial: <strong>{s.capacidade || 0}</strong>
                      </span>
                      <span>
                        Leitos cadastrados: <strong>{leitosDesteSetor.length}</strong>
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => abrirEditarSetor(s)}
                      className="w-full text-xs"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" /> Editar Informações
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOG LEITO */}
      <Dialog open={dialogLeitoAberto} onOpenChange={setDialogLeitoAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{leitoEditando ? 'Editar Leito' : 'Cadastrar Novo Leito'}</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Identificação do leito e vinculação à unidade de internação
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSalvarLeito} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Identificador / Código do Leito *</Label>
              <Input
                required
                placeholder="Ex: LEITO-104, UTI-02"
                value={formLeitoCodigo}
                onChange={(e) => setFormLeitoCodigo(e.target.value)}
                className="text-sm font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Setor Responsável *</Label>
              <Select value={formLeitoSetor} onValueChange={(val) => setFormLeitoSetor(val)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {setores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome} ({s.sigla || s.tipo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tipo de Leito</Label>
              <Select value={formLeitoTipo} onValueChange={(val: any) => setFormLeitoTipo(val)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinico">Clínico Adulto</SelectItem>
                  <SelectItem value="cirurgico">Cirúrgico</SelectItem>
                  <SelectItem value="pediatrico">Pediátrico</SelectItem>
                  <SelectItem value="uti">Terapia Intensiva (UTI)</SelectItem>
                  <SelectItem value="isolamento">Isolamento Respiratório/Contato</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Status Inicial</Label>
              <Select value={formLeitoStatus} onValueChange={(val: any) => setFormLeitoStatus(val)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vago">Vago / Disponível</SelectItem>
                  <SelectItem value="ocupado">Ocupado</SelectItem>
                  <SelectItem value="higienizacao">Em Higienização</SelectItem>
                  <SelectItem value="manutencao">Em Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Observações / Equipamentos</Label>
              <Input
                placeholder="Ex: Régua de gases, monitor cardíaco..."
                value={formLeitoObs}
                onChange={(e) => setFormLeitoObs(e.target.value)}
                className="text-sm"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogLeitoAberto(false)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando} className="bg-blue-600 hover:bg-blue-500">
                {salvando ? 'Salvando...' : 'Salvar Leito'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG SETOR */}
      <Dialog open={dialogSetorAberto} onOpenChange={setDialogSetorAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{setorEditando ? 'Editar Setor' : 'Cadastrar Novo Setor'}</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Paramatrização de alas, enfermarias e unidades assistenciais
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSalvarSetor} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Nome da Unidade / Setor *</Label>
              <Input
                required
                placeholder="Ex: Enfermaria Pediátrica, UTI Adulto"
                value={formSetorNome}
                onChange={(e) => setFormSetorNome(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Sigla</Label>
              <Input
                placeholder="Ex: ENF-PED, UTI-01"
                value={formSetorSigla}
                onChange={(e) => setFormSetorSigla(e.target.value)}
                className="text-sm font-mono uppercase"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tipo de Unidade</Label>
              <Select value={formSetorTipo} onValueChange={(val: any) => setFormSetorTipo(val)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enfermaria">Enfermaria</SelectItem>
                  <SelectItem value="uti">UTI</SelectItem>
                  <SelectItem value="isolamento">Isolamento</SelectItem>
                  <SelectItem value="pronto_socorro">Pronto-Socorro / Triagem</SelectItem>
                  <SelectItem value="centro_cirurgico">Centro Cirúrgico</SelectItem>
                  <SelectItem value="ambulatorio">Ambulatório / Consultórios</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Capacidade (Número Máximo de Leitos/Atendimentos)</Label>
              <Input
                type="number"
                min="1"
                value={formSetorCapacidade}
                onChange={(e) => setFormSetorCapacidade(Number(e.target.value))}
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Descrição / Finalidade</Label>
              <Input
                placeholder="Ex: Cuidados intensivos coronarianos..."
                value={formSetorDescricao}
                onChange={(e) => setFormSetorDescricao(e.target.value)}
                className="text-sm"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogSetorAberto(false)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando} className="bg-blue-600 hover:bg-blue-500">
                {salvando ? 'Salvando...' : 'Salvar Setor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
