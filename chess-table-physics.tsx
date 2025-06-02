"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Environment, Html } from "@react-three/drei"
import { Physics, useBox, useCylinder } from "@react-three/cannon"
import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import * as THREE from "three"

// Simple chess piece component with physics - no symbols
function ChessPiece({
  position,
  piece,
  isWhite,
  shakeForce,
}: {
  position: [number, number, number]
  piece: string
  isWhite: boolean
  shakeForce: number
}) {
  const [ref, api] = useCylinder(() => ({
    mass: 1.0,
    position,
    args: [0.12, 0.15, getPieceHeight(piece)],
    material: {
      friction: 0.9,
      restitution: 0.1,
    },
  }))

  function getPieceHeight(piece: string) {
    const p = piece.toLowerCase()
    if (p === "p") return 0.3
    if (p === "r") return 0.4
    if (p === "n" || p === "b") return 0.45
    if (p === "q") return 0.5
    if (p === "k") return 0.55
    return 0.4
  }

  // Apply shake forces
  useEffect(() => {
    if (shakeForce > 0) {
      const forceX = (Math.random() - 0.5) * shakeForce * 0.4
      const forceZ = (Math.random() - 0.5) * shakeForce * 0.4
      const forceY = Math.random() * shakeForce * 0.15
      api.applyImpulse([forceX, forceY, forceZ], [0, 0, 0])
    }
  }, [shakeForce, api])

  return (
    <mesh ref={ref} castShadow receiveShadow>
      <cylinderGeometry args={[0.12, 0.15, getPieceHeight(piece), 12]} />
      <meshStandardMaterial color={isWhite ? "#f5f5dc" : "#2c1810"} roughness={0.3} metalness={isWhite ? 0.1 : 0.2} />
    </mesh>
  )
}

// Solid chess board component - ONE SOLID PIECE
function SolidChessBoard({ shakeForce }: { shakeForce: number }) {
  const boardGroupRef = useRef<THREE.Group>(null)
  const safeYPosition = -0.3

  // Create physics body for the entire board as one solid piece
  const [boardRef] = useBox(() => ({
    mass: 0,
    position: [0, safeYPosition, 0],
    args: [4.0, 0.1, 4.0], // Solid board: 4x4 units, 0.1 thick
    type: "Static",
    material: {
      friction: 0.9,
      restitution: 0.1,
    },
  }))

  // Apply shake to the entire board as one unit
  useFrame(() => {
    if (boardGroupRef.current && shakeForce > 0) {
      const time = Date.now() * 0.01
      const intensity = shakeForce * 0.015

      // Apply rotation shake (small amounts)
      boardGroupRef.current.rotation.x = Math.sin(time * 3) * intensity * 0.5
      boardGroupRef.current.rotation.z = Math.cos(time * 2.5) * intensity * 0.5

      // Apply ONLY UPWARD jumping motion - never downward
      const jumpHeight = (Math.sin(time * 6) * 0.5 + 0.5) * intensity * 0.3
      boardGroupRef.current.position.y = safeYPosition + jumpHeight
    } else if (boardGroupRef.current) {
      // Reset to safe position when not shaking
      boardGroupRef.current.rotation.x = 0
      boardGroupRef.current.rotation.z = 0
      boardGroupRef.current.position.y = safeYPosition
    }
  })

  return (
    <group ref={boardGroupRef} position={[0, safeYPosition, 0]}>
      {/* Solid board with physics collision */}
      <mesh ref={boardRef} receiveShadow castShadow>
        <boxGeometry args={[4.0, 0.1, 4.0]} />
        <meshStandardMaterial color="#d4a574" roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Visual chess squares (no physics, just decoration) */}
      {Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 8 }, (_, col) => {
          const isLight = (row + col) % 2 === 0
          const x = (col - 3.5) * 0.5
          const z = (row - 3.5) * 0.5
          return (
            <mesh key={`${row}-${col}`} position={[x, 0.051, z]} receiveShadow>
              <boxGeometry args={[0.48, 0.001, 0.48]} />
              <meshStandardMaterial color={isLight ? "#f0d9b5" : "#b58863"} roughness={0.8} metalness={0.1} />
            </mesh>
          )
        }),
      )}

      {/* Board frame */}
      <mesh position={[0, 0.05, -2.1]} receiveShadow castShadow>
        <boxGeometry args={[4.4, 0.15, 0.2]} />
        <meshStandardMaterial color="#654321" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.05, 2.1]} receiveShadow castShadow>
        <boxGeometry args={[4.4, 0.15, 0.2]} />
        <meshStandardMaterial color="#654321" roughness={0.6} />
      </mesh>
      <mesh position={[-2.1, 0.05, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.2, 0.15, 4.4]} />
        <meshStandardMaterial color="#654321" roughness={0.6} />
      </mesh>
      <mesh position={[2.1, 0.05, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.2, 0.15, 4.4]} />
        <meshStandardMaterial color="#654321" roughness={0.6} />
      </mesh>
    </group>
  )
}

// Table component with solid physics - BLACKISH COLOR
function Table() {
  // Table top - solid physics body - WIDER
  const [tableTopRef] = useBox(() => ({
    mass: 0,
    position: [0, -0.6, 0],
    args: [5.5, 0.15, 5.5],
    type: "Static",
  }))

  // Table legs - solid physics bodies - REPOSITIONED
  const [leg1Ref] = useBox(() => ({
    mass: 0,
    position: [2.3, -1.5, 2.3],
    args: [0.15, 2, 0.15],
    type: "Static",
  }))

  const [leg2Ref] = useBox(() => ({
    mass: 0,
    position: [-2.3, -1.5, 2.3],
    args: [0.15, 2, 0.15],
    type: "Static",
  }))

  const [leg3Ref] = useBox(() => ({
    mass: 0,
    position: [2.3, -1.5, -2.3],
    args: [0.15, 2, 0.15],
    type: "Static",
  }))

  const [leg4Ref] = useBox(() => ({
    mass: 0,
    position: [-2.3, -1.5, -2.3],
    args: [0.15, 2, 0.15],
    type: "Static",
  }))

  return (
    <group>
      <mesh ref={tableTopRef} receiveShadow castShadow>
        <boxGeometry args={[5.5, 0.15, 5.5]} />
        <meshStandardMaterial color="#2c2c2c" roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh ref={leg1Ref} castShadow>
        <boxGeometry args={[0.15, 2, 0.15]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
      </mesh>
      <mesh ref={leg2Ref} castShadow>
        <boxGeometry args={[0.15, 2, 0.15]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
      </mesh>
      <mesh ref={leg3Ref} castShadow>
        <boxGeometry args={[0.15, 2, 0.15]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
      </mesh>
      <mesh ref={leg4Ref} castShadow>
        <boxGeometry args={[0.15, 2, 0.15]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
      </mesh>
    </group>
  )
}

// Chair component - BIGGER SIZE
function Chair({
  position,
  rotation = [0, 0, 0],
}: { position: [number, number, number]; rotation?: [number, number, number] }) {
  // Chair seat - BIGGER
  const [seatRef] = useBox(() => ({
    mass: 0,
    position,
    rotation,
    args: [2.0, 0.15, 2.0],
    type: "Static",
  }))

  // Chair back - BIGGER
  const backPosition: [number, number, number] = [
    position[0] - Math.sin(rotation[1]) * 0.8,
    position[1] + 1.0,
    position[2] - Math.cos(rotation[1]) * 0.8,
  ]

  const [backRef] = useBox(() => ({
    mass: 0,
    position: backPosition,
    rotation,
    args: [2.0, 2.0, 0.15],
    type: "Static",
  }))

  // Chair legs - REPOSITIONED for bigger chair
  const legPositions = [
    [position[0] + 0.8, position[1] - 0.8, position[2] + 0.8],
    [position[0] - 0.8, position[1] - 0.8, position[2] + 0.8],
    [position[0] + 0.8, position[1] - 0.8, position[2] - 0.8],
    [position[0] - 0.8, position[1] - 0.8, position[2] - 0.8],
  ]

  return (
    <group>
      {/* Chair seat */}
      <mesh ref={seatRef} castShadow receiveShadow>
        <boxGeometry args={[2.0, 0.15, 2.0]} />
        <meshStandardMaterial color="#2c2c2c" roughness={0.7} />
      </mesh>

      {/* Chair back */}
      <mesh ref={backRef} castShadow receiveShadow>
        <boxGeometry args={[2.0, 2.0, 0.15]} />
        <meshStandardMaterial color="#2c2c2c" roughness={0.7} />
      </mesh>

      {/* Chair legs */}
      {legPositions.map((legPos, index) => (
        <mesh key={index} position={legPos} castShadow receiveShadow>
          <boxGeometry args={[0.15, 1.6, 0.15]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

// TV Screen component with embedded YouTube video - FIXED RATIO
function TVScreen() {
  // TV Frame - Black border - SMALLER SIZE - ON LEFT WALL
  const [tvFrameRef] = useBox(() => ({
    mass: 0,
    position: [-14.9, 2.5, 0],
    rotation: [0, Math.PI / 2, 0],
    args: [6.0, 3.375, 0.3],
    type: "Static",
  }))

  return (
    <group>
      {/* TV Frame */}
      <mesh ref={tvFrameRef} castShadow receiveShadow>
        {/* <boxGeometry args={[6.0, 3.375, 0.3]} /> */}
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* TV Screen with embedded YouTube iframe - UPDATED EMBED */}
      <Html
        transform
        occlude="blending"
        position={[-14.7, 2.5, 0]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[5.7, 3.2, 1]}
        style={{
          width: "100px",
          height: "56.25px",
          backgroundColor: "#000",
          borderRadius: "0px",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <iframe
          src="https://www.youtube.com/embed/DUq58vLiT8g?si=H8VlmTaryg6I_O36&controls=0&autoplay=1&loop=1&playlist=DUq58vLiT8g&mute=1"
          title="YouTube video player"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
            margin: "0",
            pointerEvents: "none",
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </Html>

      {/* Nowayy Chess text above the TV - CLEAN BLACK TEXT */}
      <Html
        transform
        position={[-14.9, 5.5, 0]}
        rotation={[0, Math.PI / 2, 0]}
        style={{
          color: "#000000",
          fontSize: "32px",
          fontWeight: "bold",
          fontFamily: "system-ui",
          textAlign: "center",
          pointerEvents: "none",
          userSelect: "none",
          textShadow: "1px 1px 2px rgba(255,255,255,0.8)",
        }}
      >
        <div>NOWAYY CHESS</div>
      </Html>
    </group>
  )
}

// Wall Text Component - USING HTML INSTEAD OF 3D TEXT
function WallText() {
  return (
    <Html
      transform
      position={[0, 3, 14.8]}
      rotation={[0, Math.PI, 0]}
      style={{
        color: "#000000",
        fontSize: "48px",
        fontWeight: "bold",
        fontFamily: "system-ui",
        textAlign: "center",
        pointerEvents: "none",
        userSelect: "none",
        textShadow: "1px 1px 2px rgba(255,255,255,0.8)",
      }}
    >
      <div>NOWAYY CHESS</div>
    </Html>
  )
}

// Wooden floor - LARGER
function WoodenFloor() {
  const [ref] = useBox(() => ({
    mass: 0,
    position: [0, -3, 0],
    args: [40, 0.1, 40],
    type: "Static",
  }))

  return (
    <mesh ref={ref} receiveShadow>
      <boxGeometry args={[40, 0.1, 40]} />
      <meshStandardMaterial color="#c19a6b" roughness={0.8} />
    </mesh>
  )
}

// Room walls - MUCH LARGER ROOM
function RoomWalls() {
  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, 2.5, -15]} receiveShadow>
        <boxGeometry args={[30, 15, 0.2]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
      </mesh>

      {/* Front wall */}
      <mesh position={[0, 2.5, 15]} receiveShadow>
        <boxGeometry args={[30, 15, 0.2]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-15, 2.5, 0]} receiveShadow>
        <boxGeometry args={[0.2, 15, 30]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
      </mesh>

      {/* Right wall */}
      <mesh position={[15, 2.5, 0]} receiveShadow>
        <boxGeometry args={[0.2, 15, 30]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, 10, 0]} receiveShadow>
        <boxGeometry args={[30, 0.2, 30]} />
        <meshStandardMaterial color="#f8f8f8" roughness={0.5} />
      </mesh>
    </group>
  )
}

// Custom camera controls to prevent going through walls
function CameraController() {
  const controlsRef = useRef<any>()

  useFrame(({ camera }) => {
    if (controlsRef.current) {
      // Get current camera position
      const position = new THREE.Vector3().copy(camera.position)

      // Room boundaries (slightly inside the walls)
      const minX = -14.5
      const maxX = 14.5
      const minY = -2.5
      const maxY = 9.5
      const minZ = -14.5
      const maxZ = 14.5

      // Clamp position within room boundaries
      position.x = Math.max(minX, Math.min(maxX, position.x))
      position.y = Math.max(minY, Math.min(maxY, position.y))
      position.z = Math.max(minZ, Math.min(maxZ, position.z))

      // Update camera position
      camera.position.copy(position)
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      enableRotate={true}
      minDistance={5}
      maxDistance={14}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2}
      rotateSpeed={0.7}
      zoomSpeed={0.8}
      target={[0, 0, 0]}
      enableDamping={true}
      dampingFactor={0.05}
    />
  )
}

// Main chess scene
function ChessScene({ shakeForce, resetTrigger }: { shakeForce: number; resetTrigger: number }) {
  const [pieces, setPieces] = useState<any[]>([])

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

  function getPieceHeight(piece: string) {
    const p = piece.toLowerCase()
    if (p === "p") return 0.3
    if (p === "r") return 0.4
    if (p === "n" || p === "b") return 0.45
    if (p === "q") return 0.5
    if (p === "k") return 0.55
    return 0.4
  }

  useEffect(() => {
    const newPieces: any[] = []
    initialBoard.forEach((row, rowIndex) => {
      row.forEach((piece, colIndex) => {
        if (piece !== ".") {
          const isWhite = piece === piece.toUpperCase()
          const x = (colIndex - 3.5) * 0.5
          const z = (rowIndex - 3.5) * 0.5

          const boardSurface = -0.3 + 0.05
          const pieceHeight = getPieceHeight(piece)
          const pieceY = boardSurface + pieceHeight / 2

          newPieces.push({
            id: `${rowIndex}-${colIndex}`,
            piece,
            isWhite,
            position: [x, pieceY, z] as [number, number, number],
          })
        }
      })
    })
    setPieces(newPieces)
  }, [resetTrigger])

  return (
    <group>
      <RoomWalls />
      <WoodenFloor />
      <Table />
      <SolidChessBoard shakeForce={shakeForce} />
      <TVScreen />
      <WallText />

      {/* Two chairs on opposite sides */}
      <Chair position={[0, -1.5, 5]} rotation={[0, Math.PI, 0]} />
      <Chair position={[0, -1.5, -5]} rotation={[0, 0, 0]} />

      {pieces.map((pieceData) => (
        <ChessPiece
          key={`${pieceData.id}-${resetTrigger}`}
          position={pieceData.position}
          piece={pieceData.piece}
          isWhite={pieceData.isWhite}
          shakeForce={shakeForce}
        />
      ))}
    </group>
  )
}

// Loading component
function LoadingScreen() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#1a1a1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        color: "#ffffff",
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          width: "60px",
          height: "60px",
          border: "4px solid rgba(255, 255, 255, 0.2)",
          borderTop: "4px solid #ffffff",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          marginBottom: "20px",
        }}
      />
      <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>Nowayy Chess</h2>
      <p style={{ fontSize: "16px", opacity: 0.8 }}>If u come for the king...</p>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default function Component() {
  const [shakeIntensity, setShakeIntensity] = useState(0)
  const [shakeForce, setShakeForce] = useState(0)
  const [resetTrigger, setResetTrigger] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)

    return () => {
      window.removeEventListener("resize", checkMobile)
      clearTimeout(timer)
    }
  }, [])

  const shakeBoard = () => {
    const newIntensity = Math.min(shakeIntensity + 1, 10)
    setShakeIntensity(newIntensity)
    setShakeForce(newIntensity)

    setTimeout(() => {
      setShakeForce(0)
    }, 500)
  }

  const resetBoard = () => {
    setShakeIntensity(0)
    setShakeForce(0)
    setResetTrigger((prev) => prev + 1)
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* 3D CANVAS - BACKGROUND */}
      <div style={{ position: "absolute", inset: 0 }}>
        <Canvas
          shadows
          camera={{
            // position: isMobile ? [-5, 3, 10] : [-5, 3, 10], // Front view facing the board and screen
            // position: isMobile ? [10, 3, 0] : [12, 3, 0], // Adjusted position: more positive X to be on the right side
            position: isMobile ? [12, 4, 0] : [15, 4, 0], // Adjusted position: more positive X to be further back
            fov: isMobile ? 60 : 50,
            near: 0.1,
            far: 1000,
          }}
          style={{ background: "linear-gradient(to bottom, #dbeafe, #bbf7d0)" }}
        >
          <Physics
            gravity={[0, -9.82, 0]}
            defaultContactMaterial={{
              friction: 0.4,
              restitution: 0.3,
            }}
          >
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[10, 15, 5]}
              intensity={1.2}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-far={50}
              shadow-camera-left={-20}
              shadow-camera-right={20}
              shadow-camera-top={20}
              shadow-camera-bottom={-20}
            />
            <pointLight position={[-5, 10, -5]} intensity={0.6} />

            <ChessScene shakeForce={shakeForce} resetTrigger={resetTrigger} />

            <Environment preset="apartment" />
          </Physics>

          {/* Custom camera controller to prevent going through walls */}
          <CameraController />
        </Canvas>
      </div>

      {/* UI OVERLAY - MOBILE RESPONSIVE */}
      <div
        style={{
          position: "absolute",
          bottom: isMobile ? 105 : 100,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 2147483647,
          padding: isMobile ? 16 : 24, // Increased padding
          pointerEvents: "auto",
          display: "flex",
          flexDirection: isMobile ? "column" : "column",
          alignItems: "center",
          width: "auto",
          maxWidth: isMobile ? "95%" : "90%",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: isMobile ? 12 : 16, // Increased gap between buttons
            marginTop: isMobile ? 8 : 12, // Increased margin-top
            flexDirection: isMobile ? "column" : "row",
            width: isMobile ? "100%" : "auto",
          }}
        >
          <Button
            onClick={shakeBoard}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2"
            style={{
              fontSize: isMobile ? "16px" : "20px", // Increased font size
              padding: isMobile ? "12px 24px" : "16px 32px", // Increased padding
              minHeight: isMobile ? "50px" : "auto", // Touch-friendly height
              width: isMobile ? "100%" : "auto",
            }}
          >
            Magnus bangs the table!
          </Button>
          <Button
            onClick={resetBoard}
            variant="outline"
            className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white px-4 py-2"
            style={{
              fontSize: isMobile ? "16px" : "20px", // Increased font size
              padding: isMobile ? "12px 24px" : "16px 32px", // Increased padding
              minHeight: isMobile ? "50px" : "auto", // Touch-friendly height
              width: isMobile ? "100%" : "auto",
            }}
          >
            Gukesh sets the board
          </Button>
        </div>
      </div>

      {/* Mobile touch instructions */}
      {isMobile && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2147483647,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            borderRadius: 8,
            padding: 8,
            pointerEvents: "none",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          {/* <p
            style={{
              color: "rgba(255, 255, 255, 0.9)",
              fontSize: 12,
              margin: 0,
              fontFamily: "system-ui",
              textAlign: "center",
            }}
          >
            👆 Touch to rotate • 🤏 Pinch to zoom
          </p> */}
        </div>
      )}
    </div>
  )
}