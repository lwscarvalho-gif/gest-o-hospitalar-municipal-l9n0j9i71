import React, { useState, useEffect } from 'react'
import { Profissional, Setor } from '@/types/hospital'
import {
  listarProfissionais,
  criarProfissional,
  atualizarProfissional,
  listarSetores,
} from '@/services/cadastros'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ClipboardList, UserPlus, Edit, Mail, Phone, Hospital, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const ProfissionaisView: React.FC = () => {
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [profEditando, setProfEditando] = useState<Profissional | null>(null)

  const { toast } = useToast()

  const [formNome, setFormNome] = useState('')
  const [formCategoria, setFormCategoria] = useState<
    'medico' | 'enfermeiro' | 'tecnico_enfermagem' | 'fisioterapeuta' | 'psicologo' | 'outro'
  >('medico')
  const [formRegistro, setFormRegistro] = useState('')
  const [formEspecialidade, setFormEspecialidade] = useState('')
  const [formCpf, setFormCpf] = useState('')
  const [formTelefone, setFormTelefone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formSetor, setFormSetor] = useState<string>('none')
  const [formAtivo, setFormAtivo] = useState(true)

  useEffect(() => {
    carregar()
  }, [])

  const carregar = async () => {
    setLoading(true)
    try {
      const [p, s] = await Promise.all([listarProfissionais(), listarSetores()])
      setProfissionais(p)
      setSetores(s)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os profissionais.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const abrirNovo = () => {
    setProfEditando(null)
    setFormNome('')
    setFormCategoria('medico')
    setFormRegistro('')
    setFormEspecialidade('')
    setFormCpf('')
    setFormTelefone('')
    setFormEmail('')
    setFormSetor('none')
    setFormAtivo(true)
    setDialogAberto(true)
  }

  const abrirEditar = (p: Profissional) => {
    setProfEditando(p)
    setFormNome(p.nome)
    setFormCategoria(p.categoria)
    setFormRegistro(p.registro_conselho)
    setFormEspecialidade(p.especialidade)
    setFormCpf(p.cpf || '')
    setFormTelefone(p.telefone || '')
    setFormEmail(p.email || '')
    setFormSetor(p.setor_padrao || 'none')
    setFormAtivo(p.ativo !== false)
    setDialogAberto(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNome.trim() || !formRegistro.trim() || !formEspecialidade.trim()) {
      toast({
        title: 'Atenção',
        description: 'Nome, Registro no Conselho e Especialidade são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const dados: Partial<Profissional> = {
        nome: formNome.trim(),
        categoria: formCategoria,
        registro_conselho: formRegistro.trim(),
        especialidade: formEspecialidade.trim(),
        cpf: formCpf.trim(),
        telefone: formTelefone.trim(),
        email: formEmail.trim(),
        setor_padrao: formSetor === 'none' ? undefined : formSetor,
        ativo: formAtivo,
      }

      if (profEditando) {
        await atualizarProfissional(profEditando.id, dados)
        toast({ title: 'Sucesso', description: 'Profissional atualizado com sucesso!' })
      } else {
        await criarProfissional(dados)
        toast({ title: 'Sucesso', description: 'Profissional cadastrado com sucesso!' })
      }

      setDialogAberto(false)
      carregar()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Erro ao persistir profissional.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const categoriaLabels: Record<string, string> = {
    medico: 'Médico(a)',
    enfermeiro: 'Enfermeiro(a)',
    tecnico_enfermagem: 'Técnico(a) Enfermagem',
    fisioterapeuta: 'Fisioterapeuta',
    psicologo: 'Psicólogo(a)',
    outro: 'Outro',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            Corpo Clínico & Profissionais de Saúde
          </h1>
          <p className="text-xs text-slate-500">
            Médicos, equipe de enfermagem, especialistas e lotação setorial
          </p>
        </div>
        <Button onClick={abrirNovo} className="bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm">
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Profissional
        </Button>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">
            Profissionais Cadastrados ({profissionais.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center items-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              Carregando profissionais...
            </div>
          ) : profissionais.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Nenhum profissional cadastrado.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {profissionais.map((p) => (
                <div
                  key={p.id}
                  className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{p.nome}</span>
                      <Badge variant="outline" className="text-[11px] bg-slate-100 text-slate-700">
                        {categoriaLabels[p.categoria] || p.categoria}
                      </Badge>
                      <Badge className="bg-emerald-100 text-emerald-800 text-[11px] font-mono border-0">
                        {p.registro_conselho}
                      </Badge>
                      <span className="text-xs font-medium text-blue-700">• {p.especialidade}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                      {p.expand?.setor_padrao && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <Hospital className="w-3 h-3 text-slate-400" /> Setor:{' '}
                          {p.expand.setor_padrao.nome}
                        </span>
                      )}
                      {p.telefone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {p.telefone}
                        </span>
                      )}
                      {p.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" /> {p.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => abrirEditar(p)}
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {profEditando ? 'Editar Profissional' : 'Cadastrar Novo Profissional'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Dados do profissional de saúde para emissão de prontuários e agenda
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="nomeProf" className="text-xs">
                  Nome Completo *
                </Label>
                <Input
                  id="nomeProf"
                  required
                  placeholder="Ex: Dr. Carlos Eduardo Ramos"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Categoria Profissional *</Label>
                <Select value={formCategoria} onValueChange={(val: any) => setFormCategoria(val)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medico">Médico(a)</SelectItem>
                    <SelectItem value="enfermeiro">Enfermeiro(a)</SelectItem>
                    <SelectItem value="tecnico_enfermagem">Técnico(a) de Enfermagem</SelectItem>
                    <SelectItem value="fisioterapeuta">Fisioterapeuta</SelectItem>
                    <SelectItem value="psicologo">Psicólogo(a)</SelectItem>
                    <SelectItem value="outro">Outro Profissional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="registro" className="text-xs">
                  Registro no Conselho (CRM / COREN) *
                </Label>
                <Input
                  id="registro"
                  required
                  placeholder="Ex: CRM 4321-RO"
                  value={formRegistro}
                  onChange={(e) => setFormRegistro(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="especialidade" className="text-xs">
                  Especialidade Médica / Área de Atuação *
                </Label>
                <Input
                  id="especialidade"
                  required
                  placeholder="Ex: Clínica Médica, Cardiologia, Pediatria..."
                  value={formEspecialidade}
                  onChange={(e) => setFormEspecialidade(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cpfProf" className="text-xs">
                  CPF
                </Label>
                <Input
                  id="cpfProf"
                  placeholder="000.000.000-00"
                  value={formCpf}
                  onChange={(e) => setFormCpf(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="telProf" className="text-xs">
                  Telefone
                </Label>
                <Input
                  id="telProf"
                  placeholder="(69) 90000-0000"
                  value={formTelefone}
                  onChange={(e) => setFormTelefone(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="emailProf" className="text-xs">
                  E-mail
                </Label>
                <Input
                  id="emailProf"
                  type="email"
                  placeholder="profissional@saude.gov.br"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Setor de Atuação Padrão</Label>
                <Select value={formSetor} onValueChange={(val) => setFormSetor(val)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum / Rotativo</SelectItem>
                    {setores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <Loader2 className="w-4 h-4 animate-spin" /> Gravando...
                  </span>
                ) : (
                  'Salvar Profissional'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
