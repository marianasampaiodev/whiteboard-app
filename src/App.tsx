// src/App.tsx

import { useRef, useEffect, useState } from 'react'
import { useWhiteboard, ydoc } from './canvas/useWhiteboard'
import { initPeer } from './webrtc/peer'
import { Toolbar } from './toolbar/Toolbar'
import type { ToolbarState } from './toolbar/Toolbar'
import * as Y from 'yjs'

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Estado da toolbar — começa com preto, espessura 2, borracha desligada
  const [toolbar, setToolbar] = useState<ToolbarState>({
    color: '#1a1a1a',
    size: 2,
    eraser: false,
  })

  // Passa o estado da toolbar para o hook do canvas
  useWhiteboard(canvasRef, toolbar)

  useEffect(() => {
    const ROOM_ID = 'sala-teste'

    initPeer(ROOM_ID, {
      onDataChannel: (channel) => {
        console.log('✅ Canal pronto:', channel.label)

        ydoc.on('update', (update: any) => {
          if (channel.readyState === 'open') {
             const uint8 = new Uint8Array(update)
             channel.send(uint8)

             }
})
      },

      onMessage: (data: ArrayBuffer) => {
        const update = new Uint8Array(data)
        Y.applyUpdate(ydoc, update)
      },
    })
  }, [])

  return (
    <>
      {/* Toolbar fixa no topo */}
      <Toolbar state={toolbar} onChange={setToolbar} />

      {/* Canvas com padding-top para não ficar embaixo da toolbar */}
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100vw',
          height: '100vh',
          cursor: toolbar.eraser ? 'cell' : 'crosshair',
          paddingTop: '56px',
        }}
      />
    </>
  )
}

export default App