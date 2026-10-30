import packageInfo from '../../package.json'

/**
 * Fonte única da versão da aplicação.
 * O package.json é incrementado automaticamente pelo ecossistema da plataforma a cada commit
 * (ex.: 0.0.74 -> 0.0.75).
 * Exportamos a versão e formatadores seguros para uso em cabeçalhos, rodapés e badges.
 */
export const APP_VERSION: string = packageInfo.version || '0.0.74'

export const APP_VERSION_LABEL: string = `v${APP_VERSION}`

export const APP_SYSTEM_NAME = 'Gestão Hospitalar Municipal'
