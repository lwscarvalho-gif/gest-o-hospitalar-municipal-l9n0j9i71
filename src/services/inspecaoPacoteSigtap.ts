// Teste de execução controlada local para amostragem determinística e estatísticas do pacote oficial
import { unzipSync } from 'fflate'
import {
  descompactarZipSeguro,
  processarPacoteSigtapPosicional,
  decodificarTextoBytes,
  parseArquivoLayoutSigtap,
  parseValorMonetarioPosicional,
} from '../services/importadorSigtapPosicional'

export interface RelatorioInspecaoPacoteReal {
  arquivoNome: string
  tamanhoBytes: number
  sha256: string
  competenciaPacote: string
  totalArquivosInternos: number
  listaArquivosInternos: string[]
  totalLinhasTbProcedimento: number
  totalValidos: number
  totalRejeitados: number
  primeiroProcedimento: {
    linha: number
    codigo: string
    nome: string
    vl_sh: number
    vl_sa: number
    vl_sp: number
  }
  registroMeioProcedimento: {
    linha: number
    codigo: string
    nome: string
    vl_sh: number
    vl_sa: number
    vl_sp: number
  }
  ultimoProcedimento: {
    linha: number
    codigo: string
    nome: string
    vl_sh: number
    vl_sa: number
    vl_sp: number
  }
  layoutProcedimentoColunas: {
    nome: string
    inicio: number
    fim: number
    tamanho: number
    tipo: string
  }[]
  gruposContagem: number
  subGruposContagem: number
  formasContagem: number
}
