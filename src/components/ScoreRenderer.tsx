'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Dot } from 'vexflow'
import type { VexFlowScore, VexFlowMeasure, StaveNoteData } from '@/lib/musicxml/converter'
import { usePlaybackStore } from '@/lib/store/usePlaybackStore'

interface ScoreRendererProps {
  score: VexFlowScore
  measuresPerSystem?: number
  highlightColor?: string
}

interface SystemLayout {
  measures: VexFlowMeasure[]
  startMeasureIndex: number
  y: number
}

export function ScoreRenderer({
  score,
  measuresPerSystem = 4,
  highlightColor = '#4F46E5', // indigo-600
}: ScoreRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)
  const noteElementsRef = useRef<Map<number, SVGElement>>(new Map())

  const { highlightedNoteIndex } = usePlaybackStore()

  // Handle responsive sizing
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width
        if (newWidth > 0 && newWidth !== containerWidth) {
          setContainerWidth(newWidth)
        }
      }
    })

    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [containerWidth])

  // Calculate system layouts
  const calculateSystems = useCallback((): SystemLayout[] => {
    const systems: SystemLayout[] = []
    const staveHeight = 150
    const topPadding = 40

    let currentY = topPadding

    for (let i = 0; i < score.measures.length; i += measuresPerSystem) {
      const systemMeasures = score.measures.slice(i, i + measuresPerSystem)
      systems.push({
        measures: systemMeasures,
        startMeasureIndex: i,
        y: currentY,
      })
      currentY += staveHeight
    }

    return systems
  }, [score.measures, measuresPerSystem])

  // Render the score
  useEffect(() => {
    if (!containerRef.current || score.measures.length === 0) return

    // Clear previous rendering
    containerRef.current.innerHTML = ''
    noteElementsRef.current.clear()

    const systems = calculateSystems()
    const totalHeight = systems.length * 150 + 80
    const padding = 20

    // Create SVG renderer
    const renderer = new Renderer(
      containerRef.current,
      Renderer.Backends.SVG
    )
    renderer.resize(containerWidth, totalHeight)

    const context = renderer.getContext()
    context.setFont('Arial', 10)

    // Render each system
    systems.forEach((system) => {
      renderSystem(context, system, containerWidth - padding * 2, padding)
    })
  }, [score, containerWidth, calculateSystems])

  // Render a single system (row of measures)
  const renderSystem = (
    context: any,
    system: SystemLayout,
    availableWidth: number,
    xOffset: number
  ) => {
    const measureWidth = availableWidth / system.measures.length
    let x = xOffset

    system.measures.forEach((measure, idx) => {
      const isFirstMeasure = system.startMeasureIndex + idx === 0
      const staveWidth = measureWidth - 5

      // Create stave
      const stave = new Stave(x, system.y, staveWidth)

      // Add clef, time signature, key signature on first measure
      if (isFirstMeasure) {
        stave.addClef(measure.clef || 'treble')
        if (measure.timeSignature) {
          stave.addTimeSignature(measure.timeSignature)
        }
        if (measure.keySignature) {
          stave.addKeySignature(measure.keySignature)
        }
      }

      stave.setContext(context).draw()

      // Create VexFlow notes
      if (measure.staveNotes.length > 0) {
        try {
          const vexNotes = measure.staveNotes.map((noteData) => {
            return createVexFlowNote(noteData)
          })

          // Create voice
          const voice = new Voice({ numBeats: 4, beatValue: 4 })
          voice.setMode(Voice.Mode.SOFT) // Allow incomplete measures
          voice.addTickables(vexNotes)

          // Format and draw
          new Formatter()
            .joinVoices([voice])
            .format([voice], staveWidth - (isFirstMeasure ? 80 : 30))

          voice.draw(context, stave)

          // Store note elements for highlighting
          vexNotes.forEach((note, noteIdx) => {
            const noteData = measure.staveNotes[noteIdx]
            if (!noteData.isRest && noteData.originalNoteIndex >= 0) {
              const svgEl = (note as any).getSVGElement?.()
              if (svgEl) {
                noteElementsRef.current.set(noteData.originalNoteIndex, svgEl)
              }
            }
          })
        } catch (err) {
          console.error('Error rendering measure:', err)
        }
      }

      x += measureWidth
    })
  }

  // Create a VexFlow StaveNote from our data format
  const createVexFlowNote = (noteData: StaveNoteData): StaveNote => {
    const duration = noteData.isRest
      ? noteData.duration + 'r'
      : noteData.duration

    const staveNote = new StaveNote({
      keys: noteData.keys,
      duration,
      autoStem: true,
    })

    // Add accidentals
    if (noteData.accidentals) {
      noteData.accidentals.forEach((acc) => {
        staveNote.addModifier(new Accidental(acc.type), acc.index)
      })
    }

    // Add dots
    if (noteData.dots > 0) {
      Dot.buildAndAttach([staveNote], { all: true })
    }

    return staveNote
  }

  // Handle note highlighting during playback
  useEffect(() => {
    // Reset all notes to default style
    noteElementsRef.current.forEach((element) => {
      const paths = element.querySelectorAll('path, rect, ellipse')
      paths.forEach((el) => {
        ;(el as SVGElement).style.fill = 'black'
        ;(el as SVGElement).style.stroke = 'black'
      })
    })

    // Highlight current note
    if (highlightedNoteIndex !== null && highlightedNoteIndex >= 0) {
      const element = noteElementsRef.current.get(highlightedNoteIndex)
      if (element) {
        const paths = element.querySelectorAll('path, rect, ellipse')
        paths.forEach((el) => {
          ;(el as SVGElement).style.fill = highlightColor
          ;(el as SVGElement).style.stroke = highlightColor
        })

        // Scroll into view if needed
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      }
    }
  }, [highlightedNoteIndex, highlightColor])

  if (score.measures.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        No measures to display
      </div>
    )
  }

  return (
    <div className="w-full overflow-auto bg-white rounded-lg">
      <div
        ref={containerRef}
        className="score-container min-w-full"
        role="img"
        aria-label={`Music score: ${score.title || 'Untitled'}`}
      />
    </div>
  )
}
