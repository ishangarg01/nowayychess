"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

// Matter.js will be loaded dynamically
declare global {
  interface Window {
    Matter: any
  }
}

export default function Component() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<any>(null)
  const renderRef = useRef<any>(null)
  const piecesRef = useRef<any[]>([])
  const boardRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [shakeIntensity, setShakeIntensity] = useState(0)

  // Standard chess starting position
  const initialBoard = [
    ["r", "n", "b", "q", "k", "b", "n", "r"],
    ["p", "p", "p", "p", "p", "p", "p", "p"],
    [".", ".", ".", ".", ".", ".", ".", "."],
    [".", ".", ".", ".", ".", ".", ".", "."],
    [".", ".", ".", ".", ".", ".", ".", "."],
    [".", ".", ".", ".", ".", ".", ".", "."],
    ["P", "P", "P", "P", "P", "P", "P", "P"],
    ["R", "N", "B", "Q", "K", "B", "N", "R"],
  ]

  const pieceSymbols: { [key: string]: string } = {
    K: "♔",
    Q: "♕",
    R: "♖",
    B: "♗",
    N: "♘",
    P: "♙",
    k: "♚",
    q: "♛",
    r: "♜",
    b: "♝",
    n: "♞",
    p: "♟",
  }

  useEffect(() => {
    // Load Matter.js dynamically
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"
    script.onload = () => {
      setIsLoaded(true)
      initializePhysics()
    }
    document.head.appendChild(script)

    return () => {
      if (renderRef.current) {
        window.Matter.Render.stop(renderRef.current)
      }
      if (engineRef.current) {
        window.Matter.Engine.clear(engineRef.current)
      }
    }
  }, [])

  const initializePhysics = () => {
    if (!canvasRef.current || !window.Matter) return

    const Matter = window.Matter
    const { Engine, Render, World, Bodies, Body, Events } = Matter

    // Create engine
    const engine = Engine.create()
    engine.world.gravity.y = 0.8
    engineRef.current = engine

    // Create renderer
    const render = Render.create({
      canvas: canvasRef.current,
      engine: engine,
      options: {
        width: 640,
        height: 640,
        wireframes: false,
        background: "#1a1a1a",
        showAngleIndicator: false,
        showVelocity: false,
      },
    })
    renderRef.current = render

    // Create board boundaries
    const thickness = 20
    const boardSize = 640
    const walls = [
      Bodies.rectangle(boardSize / 2, -thickness / 2, boardSize, thickness, {
        isStatic: true,
        render: { fillStyle: "#8B4513" },
      }),
      Bodies.rectangle(boardSize / 2, boardSize + thickness / 2, boardSize, thickness, {
        isStatic: true,
        render: { fillStyle: "#8B4513" },
      }),
      Bodies.rectangle(-thickness / 2, boardSize / 2, thickness, boardSize, {
        isStatic: true,
        render: { fillStyle: "#8B4513" },
      }),
      Bodies.rectangle(boardSize + thickness / 2, boardSize / 2, thickness, boardSize, {
        isStatic: true,
        render: { fillStyle: "#8B4513" },
      }),
    ]

    // Create chess board squares (visual only)
    const squareSize = 80
    const boardSquares = []
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0
        const square = Bodies.rectangle(
          col * squareSize + squareSize / 2,
          row * squareSize + squareSize / 2,
          squareSize,
          squareSize,
          {
            isStatic: true,
            render: {
              fillStyle: isLight ? "#f0d9b5" : "#b58863",
            },
          },
        )
        boardSquares.push(square)
      }
    }
    boardRef.current = boardSquares

    // Create chess pieces
    createPieces(Matter, squareSize)

    // Add all bodies to world
    World.add(engine.world, [...walls, ...boardSquares, ...piecesRef.current])

    // Start the engine and renderer
    Engine.run(engine)
    Render.run(render)

    // Custom rendering for piece symbols
    Events.on(render, "afterRender", () => {
      const context = render.canvas.getContext("2d")
      if (!context) return

      piecesRef.current.forEach((piece) => {
        if (piece.symbol) {
          context.save()
          context.translate(piece.position.x, piece.position.y)
          context.rotate(piece.angle)
          context.font = "40px serif"
          context.fillStyle = piece.isWhite ? "#ffffff" : "#000000"
          context.strokeStyle = piece.isWhite ? "#000000" : "#ffffff"
          context.lineWidth = 1
          context.textAlign = "center"
          context.textBaseline = "middle"
          context.strokeText(piece.symbol, 0, 0)
          context.fillText(piece.symbol, 0, 0)
          context.restore()
        }
      })
    })
  }

  const createPieces = (Matter: any, squareSize: number) => {
    const { Bodies } = Matter
    const pieces: any[] = []

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = initialBoard[row][col]
        if (piece !== ".") {
          const x = col * squareSize + squareSize / 2
          const y = row * squareSize + squareSize / 2
          const isWhite = piece === piece.toUpperCase()

          const pieceBody = Bodies.circle(x, y, 25, {
            restitution: 0.3,
            friction: 0.8,
            frictionAir: 0.01,
            render: {
              fillStyle: isWhite ? "#f5f5f5" : "#2c2c2c",
              strokeStyle: isWhite ? "#000000" : "#ffffff",
              lineWidth: 2,
            },
          })

          pieceBody.symbol = pieceSymbols[piece]
          pieceBody.isWhite = isWhite
          pieceBody.originalX = x
          pieceBody.originalY = y
          pieceBody.pieceType = piece

          pieces.push(pieceBody)
        }
      }
    }

    piecesRef.current = pieces
  }

  const shakeBoard = () => {
    if (!engineRef.current || !window.Matter) return

    const Matter = window.Matter
    const { Body } = Matter

    setShakeIntensity((prev) => Math.min(prev + 1, 10))
    const intensity = shakeIntensity + 1

    // Apply random forces to all pieces
    piecesRef.current.forEach((piece) => {
      const forceX = (Math.random() - 0.5) * intensity * 0.01
      const forceY = (Math.random() - 0.5) * intensity * 0.01
      Body.applyForce(piece, piece.position, { x: forceX, y: forceY })
    })

    // Shake the board squares if intensity is high enough
    if (intensity > 5 && boardRef.current) {
      boardRef.current.forEach((square: any) => {
        const shakeX = (Math.random() - 0.5) * (intensity - 5) * 2
        const shakeY = (Math.random() - 0.5) * (intensity - 5) * 2
        Body.translate(square, { x: shakeX, y: shakeY })
      })
    }
  }

  const resetBoard = () => {
    if (!engineRef.current || !window.Matter) return

    const Matter = window.Matter
    const { Body } = Matter

    setShakeIntensity(0)

    // Reset all pieces to original positions
    piecesRef.current.forEach((piece) => {
      Body.setPosition(piece, { x: piece.originalX, y: piece.originalY })
      Body.setVelocity(piece, { x: 0, y: 0 })
      Body.setAngularVelocity(piece, 0)
      Body.setAngle(piece, 0)
    })

    // Reset board squares to original positions
    if (boardRef.current) {
      const squareSize = 80
      boardRef.current.forEach((square: any, index: number) => {
        const row = Math.floor(index / 8)
        const col = index % 8
        const originalX = col * squareSize + squareSize / 2
        const originalY = row * squareSize + squareSize / 2
        Body.setPosition(square, { x: originalX, y: originalY })
      })
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Chess Physics Simulator</h1>
        <p className="text-gray-300 text-center">Click shake to disturb the pieces, reset to restore order</p>
      </div>

      <div className="border-4 border-amber-700 rounded-lg overflow-hidden shadow-2xl">
        <canvas ref={canvasRef} width={640} height={640} className="block" />
      </div>

      <div className="flex gap-4 mt-6">
        <Button
          onClick={shakeBoard}
          disabled={!isLoaded}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 text-lg font-semibold"
        >
          🌪️ Shake Board
        </Button>
        <Button
          onClick={resetBoard}
          disabled={!isLoaded}
          variant="outline"
          className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white px-6 py-3 text-lg font-semibold"
        >
          🔄 Reset
        </Button>
      </div>

      {shakeIntensity > 0 && (
        <div className="mt-4 text-center">
          <p className="text-yellow-400 font-semibold">Shake Intensity: {shakeIntensity}/10</p>
          <div className="w-48 bg-gray-700 rounded-full h-2 mt-2">
            <div
              className="bg-gradient-to-r from-yellow-400 to-red-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(shakeIntensity / 10) * 100}%` }}
            />
          </div>
        </div>
      )}

      {!isLoaded && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="text-white text-xl">Loading physics engine...</div>
        </div>
      )}
    </div>
  )
}
