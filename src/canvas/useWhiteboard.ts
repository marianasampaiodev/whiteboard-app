// src/canvas/useWhiteboard.ts

import { useEffect, useRef, type RefObject } from 'react'
import * as Y from 'yjs'
import type { ToolbarState } from '../toolbar/Toolbar'

interface Point {
  x: number
  y: number
}

export interface Line {
  points: Point[]
  color: string    // cor do traço
  size: number     // espessura do traço
  eraser: boolean  // se é borracha ou não
}

// Criamos o Y.Doc e o Y.Array fora do componente para persistir entre renders
const ydoc = new Y.Doc()
const yLines = ydoc.getArray<Line>('linhas')

export { ydoc, yLines }

// O hook agora recebe o estado da toolbar como segundo parâmetro
export function useWhiteboard(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  toolbar: ToolbarState
) {
  const currentLineRef = useRef<Point[]>([])
  const isDrawingRef = useRef(false)

  // Mantemos o toolbar num ref para acessar sempre o valor mais recente
  // dentro dos event listeners sem precisar recriar o useEffect
  const toolbarRef = useRef<ToolbarState>(toolbar)

  // Atualiza o ref sempre que o toolbar mudar
  useEffect(() => {
    toolbarRef.current = toolbar
  }, [toolbar])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Redesenha todas as linhas do Y.Array com suas respectivas cores e espessuras
    const redrawAll = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      yLines.toArray().forEach((line: Line) => {
        if (line.points.length < 2) return

        ctx.beginPath()

        // ✅ Borracha usa "destination-out" para apagar pixels do canvas.
        // Linhas normais usam "source-over" (comportamento padrão).
        if (line.eraser) {
          ctx.globalCompositeOperation = 'destination-out'
          ctx.strokeStyle = 'rgba(0,0,0,1)'
        } else {
          ctx.globalCompositeOperation = 'source-over'
          ctx.strokeStyle = line.color
        }

        ctx.lineWidth = line.size
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        ctx.moveTo(line.points[0].x, line.points[0].y)
        line.points.forEach((point: Point) => {
          ctx.lineTo(point.x, point.y)
        })
        ctx.stroke()
      })

      // Sempre restaura o modo de composição padrão após redesenhar
      ctx.globalCompositeOperation = 'source-over'
    }

    // Observer do Yjs — redesenha sempre que o Y.Array mudar
    const observer = () => { redrawAll() }
    yLines.observe(observer)

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      redrawAll()
    }

    const getPoint = (e: MouseEvent): Point => {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const handleMouseDown = (e: MouseEvent) => {
      isDrawingRef.current = true
      currentLineRef.current = [getPoint(e)]
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawingRef.current) return

      const point = getPoint(e)
      currentLineRef.current.push(point)

      // Redesenha as linhas salvas no Yjs...
      redrawAll()

      // ...mais a linha atual em tempo real com a cor/espessura atual
      if (currentLineRef.current.length >= 2) {
        const { color, size, eraser } = toolbarRef.current

        ctx.beginPath()

        if (eraser) {
          ctx.globalCompositeOperation = 'destination-out'
          ctx.strokeStyle = 'rgba(0,0,0,1)'
        } else {
          ctx.globalCompositeOperation = 'source-over'
          ctx.strokeStyle = color
        }

        ctx.lineWidth = size
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.moveTo(currentLineRef.current[0].x, currentLineRef.current[0].y)
        currentLineRef.current.forEach(p => ctx.lineTo(p.x, p.y))
        ctx.stroke()

        // Restaura o modo padrão
        ctx.globalCompositeOperation = 'source-over'
      }
    }

    const handleMouseUp = () => {
      if (!isDrawingRef.current) return

      isDrawingRef.current = false

      if (currentLineRef.current.length >= 2) {
        const { color, size, eraser } = toolbarRef.current

        // ✅ Salva a linha no Y.Array com todas as propriedades visuais
        yLines.push([{
          points: [...currentLineRef.current],
          color,
          size,
          eraser,
        }])
      }

      currentLineRef.current = []
    }

    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('resize', resizeCanvas)

    resizeCanvas()

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('resize', resizeCanvas)
      yLines.unobserve(observer)
    }
  }, [canvasRef])
}