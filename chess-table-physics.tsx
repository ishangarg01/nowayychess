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
  // ADJUSTED: Board now rests on the table, recalculated based on table top change
  const safeYPosition = -0.75

  // Create physics body for the entire board as one solid piece
  const [boardRef, boardApi] = useBox(() => ({
    mass: 0,
    position: [0, safeYPosition, 0] as [number, number, number],
    args: [4.0, 0.1, 4.0], // Collision box size
    type: "Kinematic", // Kinematic bodies can be moved manually and interact with dynamic bodies
    material: {
      friction: 0.9,
      restitution: 0.1,
    },
  }))

  // Apply shake to the entire board as one unit using the physics API
  useFrame(() => {
    if (shakeForce > 0) {
      const time = Date.now() * 0.01
      // REDUCED INTENSITY: Experiment with this multiplier to reduce clipping
      const intensity = shakeForce * 0.008

      // Calculate new rotation and position
      const rotX = Math.sin(time * 3) * intensity * 0.5
      const rotZ = Math.cos(time * 2.5) * intensity * 0.5
      const jumpHeight = (Math.sin(time * 6) * 0.5 + 0.5) * intensity * 0.3
      const newY = safeYPosition + jumpHeight

      // Use boardApi to set position and rotation
      boardApi.position.set(0, newY, 0)
      boardApi.rotation.set(rotX, 0, rotZ) // Apply rotation to X and Z, Y remains 0 for typical board shake
    } else {
      // Reset to safe position when not shaking
      boardApi.position.set(0, safeYPosition, 0)
      boardApi.rotation.set(0, 0, 0)
    }
  })

  return (
    // Attach boardRef to a <group> that contains the invisible collider and visible parts
    <group ref={boardRef} receiveShadow castShadow>
      {/* Invisible mesh to act as the actual physics collider for the board. */}
      <mesh>
        <boxGeometry args={[4.0, 0.1, 4.0]} />
        <meshBasicMaterial transparent opacity={0} /> {/* Fully transparent material */}
      </mesh>

      {/* Visual chess squares (no physics, just decoration) - now positioned ON TOP of the invisible collider */}
      {Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 8 }, (_, col) => {
          const isLight = (row + col) % 2 === 0
          const x = (col - 3.5) * 0.5
          const z = (row - 3.5) * 0.5
          return (
            // Squares are slightly above the invisible base
            <mesh key={`${row}-${col}`} position={[x, 0.051, z] as [number, number, number]} receiveShadow>
              <boxGeometry args={[0.48, 0.001, 0.48]} />
              <meshStandardMaterial color={isLight ? "#f0d9b5" : "#b58863"} roughness={0.8} metalness={0.1} />
            </mesh>
          )
        }),
      )}

      {/* Board frame - These are now children of the physics group, so they move with the board */}
      <mesh position={[0, 0.05, -2.1] as [number, number, number]} receiveShadow castShadow>
        <boxGeometry args={[4.4, 0.15, 0.2]} />
        <meshStandardMaterial color="#654321" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.05, 2.1] as [number, number, number]} receiveShadow castShadow>
        <boxGeometry args={[4.4, 0.15, 0.2]} />
        <meshStandardMaterial color="#654321" roughness={0.6} />
      </mesh>
      <mesh position={[-2.1, 0.05, 0] as [number, number, number]} receiveShadow castShadow>
        <boxGeometry args={[0.2, 0.15, 4.4]} />
        <meshStandardMaterial color="#654321" roughness={0.6} />
      </mesh>
      <mesh position={[2.1, 0.05, 0] as [number, number, number]} receiveShadow castShadow>
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
    // ADJUSTED: Table top moved down to sit on top of legs
    position: [0, -0.875, 0] as [number, number, number],
    args: [5.5, 0.15, 5.5],
    type: "Static",
  }))

  // Table legs - solid physics bodies - REPOSITIONED
  // ADJUSTED: Legs moved down to touch the floor
  const [leg1Ref] = useBox(() => ({
    mass: 0,
    position: [2.3, -1.95, 2.3] as [number, number, number],
    args: [0.15, 2, 0.15],
    type: "Static",
  }))

  const [leg2Ref] = useBox(() => ({
    mass: 0,
    position: [-2.3, -1.95, 2.3] as [number, number, number],
    args: [0.15, 2, 0.15],
    type: "Static",
  }))

  const [leg3Ref] = useBox(() => ({
    mass: 0,
    position: [2.3, -1.95, -2.3] as [number, number, number],
    args: [0.15, 2, 0.15],
    type: "Static",
  }))

  const [leg4Ref] = useBox(() => ({
    mass: 0,
    position: [-2.3, -1.95, -2.3] as [number, number, number],
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
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
}) {
  // Chair seat - BIGGER
  const [seatRef] = useBox(() => ({
    mass: 0,
    position,
    rotation,
    args: [2.0, 0.15, 2.0],
    type: "Static",
  }))

  // Chair back - BIGGER
  // Type assertion added here for backPosition
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
  // Type assertion added for each element in legPositions
  const legPositions: [number, number, number][] = [
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

      {/* Chair legs - Type assertion added here */}
      {legPositions.map((legPos, index) => (
        <mesh key={index} position={legPos as [number, number, number]} castShadow receiveShadow>
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
    // Type assertion added here
    position: [-14.9, 2.5, 0] as [number, number, number],
    // Type assertion added here
    rotation: [0, Math.PI / 2, 0] as [number, number, number],
    args: [6.0, 3.375, 0.3],
    type: "Static",
  }))

  // The CORRECT YouTube video ID from your provided embed code
  const youtubeVideoId = 'DUq58vLiT8g';
  // Constructing the embed URL with desired parameters: autoplay, mute, loop, no controls (controls=0)
  const embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&mute=1&loop=1&playlist=${youtubeVideoId}&controls=0&modestbranding=1&rel=0&showinfo=0`;

  return (
    <group>
      {/* TV Frame */}
      <mesh ref={tvFrameRef} castShadow receiveShadow>
        <boxGeometry args={[6.0, 3.375, 0.3]} /> {/* This creates the visible black frame */}
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* TV Screen with embedded YouTube iframe */}
      <Html
        transform
        occlude="blending"
        position={[-14.7, 2.5, 0] as [number, number, number]}
        rotation={[0, Math.PI / 2, 0] as [number, number, number]}
        scale={[5.7, 3.2, 1]} // Adjusted scale to fit within the frame and maintain aspect
        style={{
          width: "100px", // Base HTML element width, scale will adjust visual size
          height: "56.25px", // 16:9 aspect ratio (100 * 9 / 16)
          backgroundColor: "#000",
          borderRadius: "0px",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none", // Prevent HTML from capturing pointer events in 3D scene
        }}
      >
        <iframe
          src={embedUrl}
          title="YouTube video player"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
            margin: "0",
            pointerEvents: "none", // Ensure iframe doesn't capture events
          }}
          // Keep these attributes to allow proper video playback
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          // allowfullscreen is now handled by the 'allow' attribute's 'fullscreen' if necessary,
          // but for a no-controls, no-hover setup, explicit fullscreen might not be desired.
        />
      </Html>

      {/* Nowayy Chess text above the TV - CLEAN BLACK TEXT */}
      <Html
        transform
        position={[-14.9, 5.5, 0] as [number, number, number]}
        rotation={[0, Math.PI / 2, 0] as [number, number, number]}
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
    // Type assertion added here
    <Html
      transform
      position={[0, 3, 14.8] as [number, number, number]}
      rotation={[0, Math.PI, 0] as [number, number, number]}
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
    // Type assertion added here
    position: [0, -3, 0] as [number, number, number],
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
      {/* Back wall - Type assertion added here */}
      <mesh position={[0, 2.5, -15] as [number, number, number]} receiveShadow>
        <boxGeometry args={[30, 15, 0.2]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
      </mesh>

      {/* Front wall - Type assertion added here */}
      <mesh position={[0, 2.5, 15] as [number, number, number]} receiveShadow>
        <boxGeometry args={[30, 15, 0.2]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
      </mesh>

      {/* Left wall - Type assertion added here */}
      <mesh position={[-15, 2.5, 0] as [number, number, number]} receiveShadow>
        <boxGeometry args={[0.2, 15, 30]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
      </mesh>

      {/* Right wall - Type assertion added here */}
      <mesh position={[15, 2.5, 0] as [number, number, number]} receiveShadow>
        <boxGeometry args={[0.2, 15, 30]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
      </mesh>

      {/* Ceiling - Type assertion added here */}
      <mesh position={[0, 10, 0] as [number, number, number]} receiveShadow>
        <boxGeometry args={[30, 0.2, 30]} />
        <meshStandardMaterial color="#f8f8f8" roughness={0.5} />
      </mesh>
    </group>
  )
}

// Custom camera controls to prevent going through walls
function CameraController() {
  const controlsRef = useRef<any>(null)

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
      // Type assertion added here
      target={[0, 0, 0] as [number, number, number]}
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

          // ADJUSTED: Pieces should now sit on the adjusted board surface
          const boardSurface = -0.7 // Adjusted to be on top of the visible squares
          const pieceHeight = getPieceHeight(piece)
          const pieceY = boardSurface + pieceHeight / 2 + 0.01 // Small offset to avoid z-fighting with board squares

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

      {/* Two chairs on opposite sides - Type assertion added here */}
      <Chair
        position={[0, -1.5, 5] as [number, number, number]}
        rotation={[0, Math.PI, 0] as [number, number, number]}
      />
      <Chair position={[0, -1.5, -5] as [number, number, number]} rotation={[0, 0, 0] as [number, number, number]} />

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
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
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

    // The shake force is applied as an impulse, so it should reset after a short duration
    setTimeout(() => {
      setShakeForce(0)
    }, 500) // Apply force for 0.5 seconds
  }

  const resetBoard = () => {
    setShakeIntensity(0)
    setShakeForce(0)
    setResetTrigger((prev) => prev + 1) // Trigger re-rendering of pieces
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
            // Type assertion added here
            position: (isMobile ? [12, 4, 0] : [15, 4, 0]) as [number, number, number],
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
              // *** IMPORTANT ADDITIONS for stability ***
              contactEquationStiffness: 1e7, // Increase stiffness of contacts
              contactEquationRelaxation: 4, // Adjust relaxation of contacts
            }}
            // *** IMPORTANT ADDITIONS for stability ***
            iterations={20} // Increased physics solver iterations for stability
            maxSubSteps={20} // Allow more sub-steps per frame for stability
          >
            <ambientLight intensity={0.4} />
            <directionalLight
              // Type assertion added here
              position={[10, 15, 5] as [number, number, number]}
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
            <pointLight
              // Type assertion added here
              position={[-5, 10, -5] as [number, number, number]}
              intensity={0.6}
            />

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