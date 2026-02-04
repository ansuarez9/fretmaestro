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
  highlightColor = '#EF4444', // red-500 - high contrast against black notes
}: ScoreRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)
  const noteDataRef = useRef<{ noteIndex: number; x: number }[]>([])
  const [noteElements, setNoteElements] = useState<Map<number, Element>>(new Map())

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
    noteDataRef.current = []

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

    // Render each system and collect note positions
    systems.forEach((system) => {
      renderSystem(context, system, containerWidth - padding * 2, padding)
    })

    // After rendering, find SVG elements for notes
    // Use requestAnimationFrame to ensure SVG is fully rendered
    requestAnimationFrame(() => {
      if (!containerRef.current) return

      const svgElement = containerRef.current.querySelector('svg')
      if (!svgElement) return

      const newNoteElements = new Map<number, Element>()

      // Try multiple selectors for VexFlow note groups
      // VexFlow 5.x uses different class names
      let noteGroups = svgElement.querySelectorAll('.vf-stavenote')

      // If no results, try alternative selectors
      if (noteGroups.length === 0) {
        noteGroups = svgElement.querySelectorAll('[class*="stavenote"]')
      }

      // If still no results, find groups by structure (containing note heads)
      if (noteGroups.length === 0) {
        // Find all groups that contain ellipses (note heads) but not text
        const allGroups = svgElement.querySelectorAll('g')
        const noteGroupsArray: Element[] = []

        allGroups.forEach((g) => {
          // A note group typically has an ellipse (note head) as a direct or near child
          const hasNoteHead = g.querySelector('ellipse') !== null
          // Exclude groups that are just containers for other note groups
          const isContainer = g.querySelector('g ellipse') !== null && g.querySelector(':scope > ellipse') === null
          // Exclude rest groups (they have different structure)
          const hasPath = g.querySelector('path') !== null

          if (hasNoteHead && !isContainer) {
            noteGroupsArray.push(g)
          }
        })

        noteGroups = noteGroupsArray as unknown as NodeListOf<Element>
      }

      // Sort note data by x position for matching
      const sortedNoteData = [...noteDataRef.current].sort((a, b) => a.x - b.x)

      // Match SVG elements to note indices
      // Convert NodeList to array and sort by x position
      const sortedGroups = Array.from(noteGroups).sort((a, b) => {
        const aRect = a.getBoundingClientRect()
        const bRect = b.getBoundingClientRect()
        return aRect.left - bRect.left
      })

      sortedNoteData.forEach((noteData, idx) => {
        if (idx < sortedGroups.length) {
          newNoteElements.set(noteData.noteIndex, sortedGroups[idx])
          sortedGroups[idx].setAttribute('data-note-index', String(noteData.noteIndex))
        }
      })

      console.log('Found note groups:', sortedGroups.length, 'Expected notes:', sortedNoteData.length)

      setNoteElements(newNoteElements)
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
          const vexNotes: StaveNote[] = []

          measure.staveNotes.forEach((noteData) => {
            const vexNote = createVexFlowNote(noteData)
            vexNotes.push(vexNote)
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

          // After drawing, collect note positions for matching
          vexNotes.forEach((vexNote, noteIdx) => {
            const noteData = measure.staveNotes[noteIdx]
            if (!noteData.isRest && noteData.originalNoteIndex >= 0) {
              const bbox = vexNote.getBoundingBox()
              if (bbox) {
                noteDataRef.current.push({
                  noteIndex: noteData.originalNoteIndex,
                  x: bbox.getX(),
                })
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
    // Reset all highlighted notes to default (black)
    noteElements.forEach((element) => {
      // Get ALL descendant elements
      const allDescendants = element.querySelectorAll('*')
      allDescendants.forEach((child) => {
        const svgChild = child as SVGElement
        if (svgChild.dataset?.highlighted === 'true') {
          // Reset to black
          svgChild.setAttribute('fill', 'black')
          svgChild.setAttribute('stroke', 'black')
          svgChild.style.fill = 'black'
          svgChild.style.stroke = 'black'
          delete svgChild.dataset.highlighted
        }
      })
    })

    // Highlight current note
    if (highlightedNoteIndex !== null && highlightedNoteIndex >= 0) {
      const element = noteElements.get(highlightedNoteIndex)
      if (element) {
        // Get ALL descendant elements and highlight them
        const allDescendants = element.querySelectorAll('*')
        allDescendants.forEach((child) => {
          const svgChild = child as SVGElement
          // Set both attribute and style to ensure it works
          svgChild.setAttribute('fill', highlightColor)
          svgChild.setAttribute('stroke', highlightColor)
          svgChild.style.fill = highlightColor
          svgChild.style.stroke = highlightColor
          svgChild.dataset.highlighted = 'true'
        })
        // Also set on the element itself
        ;(element as SVGElement).setAttribute('fill', highlightColor)
        ;(element as SVGElement).setAttribute('stroke', highlightColor)
        ;(element as SVGElement).style.fill = highlightColor
        ;(element as SVGElement).style.stroke = highlightColor
      }
    }
  }, [highlightedNoteIndex, highlightColor, noteElements])

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
