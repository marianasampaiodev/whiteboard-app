// src/toolbar/Toolbar.tsx

import type { RefObject } from 'react'

// Cores disponíveis na paleta
// Cada cor tem um valor hex e um label para acessibilidade
export const COLORS = [
  { hex: '#1a1a1a', label: 'Preto' },
  { hex: '#E24B4A', label: 'Vermelho' },
  { hex: '#378ADD', label: 'Azul' },
  { hex: '#1D9E75', label: 'Verde' },
  { hex: '#EF9F27', label: 'Laranja' },
  { hex: '#D4537E', label: 'Rosa' },
  { hex: '#7F77DD', label: 'Roxo' },
  { hex: '#639922', label: 'Verde escuro' },
  { hex: '#ffffff', label: 'Branco' },
]

// Espessuras disponíveis em pixels
export const SIZES = [2, 5, 10]

// Formato do estado da toolbar — exportado para o App.tsx usar
export interface ToolbarState {
  color: string
  size: number
  eraser: boolean
}

// Props que o componente Toolbar recebe do App.tsx
interface ToolbarProps {
  state: ToolbarState
  onChange: (state: ToolbarState) => void
}

export function Toolbar({ state, onChange }: ToolbarProps) {
  return (
    <div style={{
      // Barra fixa no topo, acima do canvas
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '0 16px',
      background: 'var(--toolbar-bg, #7FFFD4)',
      borderBottom: '0.5px solid #e0e0e0',
      zIndex: 100,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>

      {/* ── LABEL COR ── */}
      <span style={{ fontSize: '11px', color: '#000000', marginRight: '4px' }}>Cor</span>

      {/* ── PALETA DE CORES ── */}
      {COLORS.map((c) => (
        <button
          key={c.hex}
          aria-label={c.label}
          onClick={() => onChange({ ...state, color: c.hex, eraser: false })}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: c.hex,
            border: state.color === c.hex && !state.eraser
              ? '3px solid #378ADD'   // borda azul na cor selecionada
              : '1.5px solid #d0d0d0',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
            transition: 'transform 0.1s',
            transform: state.color === c.hex && !state.eraser ? 'scale(1.2)' : 'scale(1)',
          }}
        />
      ))}

      {/* ── DIVISOR ── */}
      <div style={{ width: '0.5px', height: '32px', background: '#e0e0e0', margin: '0 8px' }} />

      {/* ── LABEL ESPESSURA ── */}
      <span style={{ fontSize: '11px', color: '#000000', marginRight: '4px' }}>Espessura</span>

      {/* ── BOTÕES DE ESPESSURA ── */}
      {SIZES.map((s) => (
        <button
          key={s}
          aria-label={`Espessura ${s}px`}
          onClick={() => onChange({ ...state, size: s, eraser: false })}
          style={{
            width: '40px',
            height: '32px',
            borderRadius: '6px',
            border: state.size === s && !state.eraser
              ? '2px solid #378ADD'   // borda azul na espessura selecionada
              : '0.5px solid #d0d0d0',
            background: state.size === s && !state.eraser ? '#EBF4FF' : '#f5f5f5',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          {/* Linha de preview com a espessura correspondente */}
          <div style={{
            width: '20px',
            height: `${s}px`,
            borderRadius: `${s}px`,
            background: '#1a1a1a',
          }} />
        </button>
      ))}

      {/* ── DIVISOR ── */}
      <div style={{ width: '0.5px', height: '32px', background: '#e0e0e0', margin: '0 8px' }} />

      {/* ── BOTÃO BORRACHA ── */}
      <span style={{ fontSize: '11px', color: '#000000', marginRight: '10px' }}>Borracha</span>
      <button
        aria-label="Borracha"
        onClick={() => onChange({ ...state, eraser: !state.eraser })}
        style={{
          width: '44px',
          height: '32px',
          borderRadius: '6px',
          border: state.eraser
            ? '2px solid #378ADD'   // borda azul quando borracha ativa
            : '0.5px solid #d0d0d0',
          background: state.eraser ? '#EBF4FF' : '#f5f5f5',
          cursor: 'pointer',
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        🧹
      </button>

    </div>
  )
}