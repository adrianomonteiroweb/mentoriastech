"use client"

import { useEffect } from "react"

/**
 * Espelha o escopo do tema do portal no <html>.
 *
 * O PROBLEMA: a paleta verde e escopada por `[data-portal="jobs"]` num
 * container dentro do layout do portal. Mas Dialog, Sheet, Popover e Tooltip do
 * Radix renderizam em PORTAL, direto no <body> — fora desse container. Sem
 * isto, abrir "Indicar vaga" dentro do portal verde mostraria um dialog azul,
 * com a paleta do resto do site.
 *
 * POR QUE NAO SO NO <html>: o layout de uma rota no App Router nao controla a
 * tag <html> (so o layout raiz controla). Fazer isso apenas por efeito de
 * cliente pintaria a primeira tela com a paleta do site e trocaria para verde
 * depois da hidratacao — um flash visivel em toda visita.
 *
 * A COMBINACAO: o container cuida da primeira pintura (correta no servidor, sem
 * flash) e este efeito cuida dos portais. Qualquer dialog so pode abrir depois
 * de interacao, ou seja, bem depois da hidratacao — entao nao ha janela em que
 * um portal apareca sem o tema.
 *
 * Limpa na saida para a paleta nao vazar ao navegar para fora do portal.
 */
export function PortalTheme() {
  useEffect(() => {
    const root = document.documentElement
    const previous = root.dataset.portal

    root.dataset.portal = "jobs"

    return () => {
      if (previous) root.dataset.portal = previous
      else delete root.dataset.portal
    }
  }, [])

  return null
}
