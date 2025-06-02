"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, Text3D, Center } from "@react-three/drei"
import { Physics, useBox, usePlane, useCylinder } from "@react-three/cannon"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import type * as THREE from "three"

// Chess piece component
function ChessPiece({
  position,
  piece,
  isWhite,
  onShake,
}: {
  position: [number, number, number]
  piece: string
  isWhite: boolean
  onShake: () => void
}) {
  const [ref, api] = useCylinder(() => ({
    mass: 1,
    position,
    args: [0.3, 0.3, 0.6],
    material: {
      friction: 0.4,
      restitution: 0.3,
    },
  }))

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

  const height =
    piece.toLowerCase() === "p" ? 0.8 : piece.toLowerCase() === "k" || piece.toLowerCase() === "q" ? 1.2 : 1.0

  return (
    <group>
      <mesh ref={ref} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.35, height, 8]} />
        <meshStandardMaterial color={isWhite ? "#f5f5dc" : "#2c1810"} roughness={0.3} metalness={0.1} />
      </mesh>
      <Center position={[position[0], position[1] + height / 2 + 0.1, position[2]]}>
        <Text3D font="/fonts/Geist_Bold.json" size={0.4} height={0.05} curveSegments={12}>
          {pieceSymbols[piece]}
          <meshStandardMaterial color={isWhite ? "#8b4513" : "#f5f5dc"} roughness={0.2} />
        </Text3D>
      </Center>
    </group>
  )
}

// Chess board square component
function BoardSquare({
  position,
  isLight,
  onShake,
}: {
  position: [number, number, number]
  isLight: boolean
  onShake: () => void
}) {
  const [ref, api] = useBox(() => ({
    mass: 0,
    position,
    args: [1, 0.2, 1],
    type: "Static",
  }))

  return (
    <mesh ref={ref} receiveShadow>
      <boxGeometry args={[1, 0.2, 1]} />
      <meshStandardMaterial color={isLight ? "#f0d9b5" : "#b58863"} roughness={0.8} metalness={0.1} />
    </mesh>
  )
}

// Board frame component
function BoardFrame() {
  const thickness = 0.5
  const size = 9

  return (
    <group>
      {/* Frame pieces */}
      <mesh position={[0, -0.3, -size / 2]} receiveShadow>
        <boxGeometry args={[size, 0.4, thickness]} />
        <meshStandardMaterial color="#8b4513" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.3, size / 2]} receiveShadow>
        <boxGeometry args={[size, 0.4, thickness]} />
        <meshStandardMaterial color="#8b4513" roughness={0.6} />
      </mesh>
      <mesh position={[-size / 2, -0.3, 0]} receiveShadow>
        <boxGeometry args={[thickness, 0.4, size]} />
        <meshStandardMaterial color="#8b4513" roughness={0.6} />
      </mesh>
      <mesh position={[size / 2, -0.3, 0]} receiveShadow>
        <boxGeometry args={[thickness, 0.4, size]} />
        <meshStandardMaterial color="#8b4513" roughness={0.6} />
      </mesh>
    </group>
  )
}

// Ground plane
function Ground() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -1, 0],
    type: "Static",
  }))

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#2d5a27" roughness={0.8} />
    </mesh>
  )
}

// Main chess board component
function ChessBoard({ shakeIntensity, onReset }: { shakeIntensity: number; onReset: () => void }) {
  const boardRef = useRef<THREE.Group>(null)
  const piecesRef = useRef<any[]>([])

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

  const applyShake = () => {
    if (!boardRef.current) return

    const intensity = shakeIntensity * 0.1

    // Shake the entire board
    boardRef.current.rotation.x = (Math.random() - 0.5) * intensity * 0.2
    boardRef.current.rotation.z = (Math.random() - 0.5) * intensity * 0.2
    boardRef.current.position.y = Math.sin(Date.now() * 0.01) * intensity * 0.5

    // Apply forces to pieces (this would need to be implemented with physics API)
    // For now, we'll use the board shaking effect
  }

  // Apply shake effect
  if (shakeIntensity > 0) {
    applyShake()
  }

  return (
    <group ref={boardRef}>
      {/* Board squares */}
      {Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 8 }, (_, col) => {
          const isLight = (row + col) % 2 === 0
          const x = (col - 3.5) * 1
          const z = (row - 3.5) * 1
          return <BoardSquare key={`${row}-${col}`} position={[x, 0, z]} isLight={isLight} onShake={applyShake} />
        }),
      )}

      {/* Chess pieces */}
      {initialBoard.map((row, rowIndex) =>
        row.map((piece, colIndex) => {
          if (piece === ".") return null
          const isWhite = piece === piece.toUpperCase()
          const x = (colIndex - 3.5) * 1
          const z = (rowIndex - 3.5) * 1
          return (
            <ChessPiece
              key={`${rowIndex}-${colIndex}`}
              position={[x, 1, z]}
              piece={piece}
              isWhite={isWhite}
              onShake={applyShake}
            />
          )
        }),
      )}

      <BoardFrame />
    </group>
  )
}

// Main scene component
function Scene({ shakeIntensity, onReset }: { shakeIntensity: number; onReset: () => void }) {
  return (
    <Physics gravity={[0, -9.82, 0]} defaultContactMaterial={{ friction: 0.4, restitution: 0.3 }}>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight position={[-10, 10, -10]} intensity={0.5} />

      <ChessBoard shakeIntensity={shakeIntensity} onReset={onReset} />
      <Ground />

      <Environment preset="studio" />
    </Physics>
  )
}

export default function Component() {
  const [shakeIntensity, setShakeIntensity] = useState(0)

  const shakeBoard = () => {
    setShakeIntensity((prev) => Math.min(prev + 1, 10))
  }

  const resetBoard = () => {
    setShakeIntensity(0)
    // Reset logic would be implemented here
  }

  return (
    <div className="w-full h-screen bg-gradient-to-b from-sky-200 to-green-200">
      {/* UI Controls */}
      <div className="absolute top-4 left-4 z-10 bg-black/20 backdrop-blur-sm rounded-lg p-4">
        <h1 className="text-2xl font-bold text-white mb-2">3D Chess Physics</h1>
        <p className="text-white/80 text-sm mb-4">Realistic board shaking simulation</p>

        <div className="flex gap-3 mb-4">
          <Button onClick={shakeBoard} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2">
            🌪️ Shake
          </Button>
          <Button
            onClick={resetBoard}
            variant="outline"
            className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white px-4 py-2"
          >
            🔄 Reset
          </Button>
        </div>

        {shakeIntensity > 0 && (
          <div>
            <p className="text-yellow-300 font-semibold text-sm">Intensity: {shakeIntensity}/10</p>
            <div className="w-32 bg-gray-700 rounded-full h-2 mt-1">
              <div
                className="bg-gradient-to-r from-yellow-400 to-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(shakeIntensity / 10) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Camera controls info */}
      <div className="absolute bottom-4 right-4 z-10 bg-black/20 backdrop-blur-sm rounded-lg p-3">
        <p className="text-white/80 text-xs">🖱️ Drag to rotate • 🔄 Scroll to zoom</p>
      </div>

      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{
          position: [8, 12, 8],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
      >
        <Scene shakeIntensity={shakeIntensity} onReset={resetBoard} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={25}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
    </div>
  )
}
