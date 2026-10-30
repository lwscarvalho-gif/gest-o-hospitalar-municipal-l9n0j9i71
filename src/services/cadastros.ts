import pb from '@/lib/pocketbase/client'
import { Setor, Leito, Paciente, Profissional } from '@/types/hospital'
import { registrarAuditoria } from './auditoria'

// SETORES
export async function listarSetores(): Promise<Setor[]> {
  const records = await pb.collection('setores').getFullList<Setor>({
    sort: 'nome',
  })
  return records
}

export async function criarSetor(dados: Partial<Setor>): Promise<Setor> {
  const record = await pb.collection('setores').create<Setor>(dados)
  await registrarAuditoria({
    acao: 'CRIAR_SETOR',
    modulo: 'Cadastros',
    detalhes: `Setor criado: ${record.nome} (${record.tipo})`,
    registro_id: record.id,
  })
  return record
}

export async function atualizarSetor(id: string, dados: Partial<Setor>): Promise<Setor> {
  const record = await pb.collection('setores').update<Setor>(id, dados)
  await registrarAuditoria({
    acao: 'EDITAR_SETOR',
    modulo: 'Cadastros',
    detalhes: `Setor atualizado: ${record.nome}`,
    registro_id: record.id,
  })
  return record
}

export async function excluirSetor(id: string, nome: string): Promise<boolean> {
  await pb.collection('setores').delete(id)
  await registrarAuditoria({
    acao: 'EXCLUIR_SETOR',
    modulo: 'Cadastros',
    detalhes: `Setor excluído: ${nome}`,
    registro_id: id,
  })
  return true
}

// LEITOS
export async function listarLeitos(): Promise<Leito[]> {
  const records = await pb.collection('leitos').getFullList<Leito>({
    sort: 'codigo',
    expand: 'setor',
  })
  return records
}

export async function criarLeito(dados: Partial<Leito>): Promise<Leito> {
  const record = await pb.collection('leitos').create<Leito>(dados, {
    expand: 'setor',
  })
  await registrarAuditoria({
    acao: 'CRIAR_LEITO',
    modulo: 'Internação',
    detalhes: `Leito criado: ${record.codigo} (${record.status})`,
    registro_id: record.id,
  })
  return record
}

export async function atualizarLeito(id: string, dados: Partial<Leito>): Promise<Leito> {
  const record = await pb.collection('leitos').update<Leito>(id, dados, {
    expand: 'setor',
  })
  await registrarAuditoria({
    acao: 'EDITAR_LEITO',
    modulo: 'Internação',
    detalhes: `Leito atualizado: ${record.codigo} -> status: ${record.status}`,
    registro_id: record.id,
  })
  return record
}

export async function excluirLeito(id: string, codigo: string): Promise<boolean> {
  await pb.collection('leitos').delete(id)
  await registrarAuditoria({
    acao: 'EXCLUIR_LEITO',
    modulo: 'Internação',
    detalhes: `Leito removido: ${codigo}`,
    registro_id: id,
  })
  return true
}

// PACIENTES
export async function listarPacientes(filtroTexto?: string): Promise<Paciente[]> {
  let filterStr = ''
  if (filtroTexto && filtroTexto.trim()) {
    const q = filtroTexto.trim()
    filterStr = `nome ~ "${q}" || cartao_sus ~ "${q}" || cpf ~ "${q}"`
  }
  const records = await pb.collection('pacientes').getFullList<Paciente>({
    filter: filterStr,
    sort: 'nome',
  })
  return records
}

export async function criarPaciente(dados: Partial<Paciente>): Promise<Paciente> {
  const record = await pb.collection('pacientes').create<Paciente>(dados)
  await registrarAuditoria({
    acao: 'CRIAR_PACIENTE',
    modulo: 'Pacientes',
    detalhes: `Paciente cadastrado: ${record.nome} | SUS: ${record.cartao_sus}`,
    registro_id: record.id,
  })
  return record
}

export async function atualizarPaciente(id: string, dados: Partial<Paciente>): Promise<Paciente> {
  const record = await pb.collection('pacientes').update<Paciente>(id, dados)
  await registrarAuditoria({
    acao: 'EDITAR_PACIENTE',
    modulo: 'Pacientes',
    detalhes: `Paciente atualizado: ${record.nome}`,
    registro_id: record.id,
  })
  return record
}

// PROFISSIONAIS
export async function listarProfissionais(): Promise<Profissional[]> {
  const records = await pb.collection('profissionais').getFullList<Profissional>({
    sort: 'nome',
    expand: 'setor_padrao',
  })
  return records
}

export async function criarProfissional(dados: Partial<Profissional>): Promise<Profissional> {
  const record = await pb.collection('profissionais').create<Profissional>(dados, {
    expand: 'setor_padrao',
  })
  await registrarAuditoria({
    acao: 'CRIAR_PROFISSIONAL',
    modulo: 'Cadastros',
    detalhes: `Profissional cadastrado: ${record.nome} | ${record.registro_conselho}`,
    registro_id: record.id,
  })
  return record
}

export async function atualizarProfissional(
  id: string,
  dados: Partial<Profissional>,
): Promise<Profissional> {
  const record = await pb.collection('profissionais').update<Profissional>(id, dados, {
    expand: 'setor_padrao',
  })
  await registrarAuditoria({
    acao: 'EDITAR_PROFISSIONAL',
    modulo: 'Cadastros',
    detalhes: `Profissional atualizado: ${record.nome}`,
    registro_id: record.id,
  })
  return record
}
