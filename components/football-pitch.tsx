"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import html2canvas from "html2canvas"
import type { Team, Player, DrawingMode } from "@/lib/types"
import PlayerMarker from "@/components/player-marker"
import DrawingTools from "@/components/drawing-tools"

interface FootballPitchProps {
  homeTeam: Team
  awayTeam: Team
  drawingMode: DrawingMode
  onUpdatePlayer: (player: Player) => void
  canDragPlayers: boolean
}

export default function FootballPitch({
  homeTeam,
  awayTeam,
  drawingMode,
  onUpdatePlayer,
  canDragPlayers = false,
}: FootballPitchProps) {
  const pitchRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [dragging, setDragging] = useState<string | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null)
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [strokeColor, setStrokeColor] = useState("#ffff00")

  // Khởi tạo vị trí cho cầu thủ mới và tránh chồng lấp
  useEffect(() => {
    const allPlayers = [...homeTeam.players, ...awayTeam.players].filter((p) => !p.isSubstitute)
    const newPositions = { ...positions }

    // Tạo bản đồ vị trí đã sử dụng để tránh chồng lấp
    const usedPositions: { x: number; y: number }[] = []
    const minDistance = 40 // Khoảng cách tối thiểu giữa các cầu thủ

    allPlayers.forEach((player) => {
      if (!newPositions[player.id]) {
        // Đặt vị trí mặc định dựa trên vai trò cầu thủ và đội
        const isHome = player.id.startsWith("home") || player.id.startsWith("player")

        // Lấy vị trí ban đầu
        let position = getPlayerPosition(player.position, isHome ? "home" : "away")

        // Kiểm tra và điều chỉnh vị trí để tránh chồng lấp
        position = findNonOverlappingPosition(position, usedPositions, minDistance)

        // Lưu vị trí đã sử dụng
        usedPositions.push(position)

        // Cập nhật vị trí cho cầu thủ
        newPositions[player.id] = position
      } else {
        // Nếu cầu thủ đã có vị trí, thêm vào danh sách vị trí đã sử dụng
        usedPositions.push(newPositions[player.id])
      }
    })

    setPositions(newPositions)
  }, [homeTeam.players, awayTeam.players])

  // Hàm tìm vị trí không chồng lấp
  const findNonOverlappingPosition = (
    position: { x: number; y: number },
    usedPositions: { x: number; y: number }[],
    minDistance: number,
  ): { x: number; y: number } => {
    // Nếu không có vị trí nào đã sử dụng, trả về vị trí ban đầu
    if (usedPositions.length === 0) return position

    // Kiểm tra xem vị trí có chồng lấp với bất kỳ vị trí nào đã sử dụng không
    const isOverlapping = usedPositions.some((usedPos) => {
      const distance = Math.sqrt(Math.pow(position.x - usedPos.x, 2) + Math.pow(position.y - usedPos.y, 2))
      return distance < minDistance
    })

    // Nếu không chồng lấp, trả về vị trí ban đầu
    if (!isOverlapping) return position

    // Nếu chồng lấp, tìm vị trí mới
    const maxAttempts = 10
    let attempts = 0
    let newPosition = { ...position }

    while (attempts < maxAttempts) {
      // Tạo vị trí mới với một offset ngẫu nhiên
      const offsetX = (Math.random() - 0.5) * minDistance
      const offsetY = (Math.random() - 0.5) * minDistance

      newPosition = {
        x: position.x + offsetX,
        y: position.y + offsetY,
      }

      // Đảm bảo vị trí mới nằm trong giới hạn sân
      newPosition.x = Math.max(30, Math.min(470, newPosition.x))
      newPosition.y = Math.max(30, Math.min(470, newPosition.y))

      // Kiểm tra xem vị trí mới có chồng lấp không
      const stillOverlapping = usedPositions.some((usedPos) => {
        const distance = Math.sqrt(Math.pow(newPosition.x - usedPos.x, 2) + Math.pow(newPosition.y - usedPos.y, 2))
        return distance < minDistance
      })

      if (!stillOverlapping) return newPosition

      attempts++
    }

    // Nếu không tìm được vị trí không chồng lấp sau nhiều lần thử, trả về vị trí ban đầu
    return position
  }

  // Hàm định vị cầu thủ dựa trên vị trí và đội
  const getPlayerPosition = (position: string, team: "home" | "away") => {
    // Kích thước sân
    const pitchWidth = 500
    const pitchHeight = 500

    // Tính toán vị trí dựa trên tỷ lệ phần trăm của sân
    const getCoordinates = (xPercent: number, yPercent: number) => {
      return {
        x: (pitchWidth * xPercent) / 100,
        y: (pitchHeight * yPercent) / 100,
      }
    }

    // Đảo ngược vị trí nếu là đội khách
    const isHome = team === "home"

    switch (position) {
      case "GK":
        return getCoordinates(isHome ? 10 : 90, 50)
      case "LB":
        return getCoordinates(isHome ? 20 : 80, 20)
      case "CB":
        return getCoordinates(isHome ? 20 : 80, 50)
      case "RB":
        return getCoordinates(isHome ? 20 : 80, 80)
      case "DMF":
        return getCoordinates(isHome ? 35 : 65, 50)
      case "CMF":
        return getCoordinates(isHome ? 50 : 50, 50)
      case "LWF":
        return getCoordinates(isHome ? 70 : 30, 20)
      case "CF":
        return getCoordinates(isHome ? 75 : 25, 50)
      case "RWF":
        return getCoordinates(isHome ? 70 : 30, 80)
      default:
        return getCoordinates(isHome ? 50 : 50, 50)
    }
  }

  // Xử lý vẽ
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Đảm bảo canvas có kích thước đúng
    const resizeCanvas = () => {
      if (pitchRef.current && canvas) {
        const rect = pitchRef.current.getBoundingClientRect()
        canvas.width = rect.width
        canvas.height = rect.height
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  // Xử lý kéo thả cầu thủ
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if (drawingMode !== "none" || !canDragPlayers) return
    if (!pitchRef.current) return

    e.stopPropagation()

    const rect = e.currentTarget.getBoundingClientRect()
    setOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    setDragging(id)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (drawingMode !== "none") {
      handleDrawing(e)
      return
    }

    if (!dragging || !pitchRef.current || !canDragPlayers) return

    const rect = pitchRef.current.getBoundingClientRect()
    const x = Math.max(20, Math.min(rect.width - 20, e.clientX - rect.left))
    const y = Math.max(20, Math.min(rect.height - 20, e.clientY - rect.top))

    setPositions((prev) => ({
      ...prev,
      [dragging]: { x, y },
    }))
  }

  const handleMouseUp = () => {
    setDragging(null)
    setIsDrawing(false)
    setLastPos(null)
  }

  // Xử lý vẽ chiến thuật
  const handleDrawingStart = (e: React.MouseEvent) => {
    if (drawingMode === "none") return

    const canvas = canvasRef.current
    if (!canvas || !pitchRef.current) return

    setIsDrawing(true)

    const rect = pitchRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setLastPos({ x, y })

    // Bắt đầu vẽ điểm
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.beginPath()
      ctx.arc(x, y, strokeWidth / 2, 0, Math.PI * 2)
      ctx.fillStyle = drawingMode === "pencil" ? strokeColor : "rgba(0,0,0,0)"

      if (drawingMode === "eraser") {
        ctx.globalCompositeOperation = "destination-out"
      } else {
        ctx.globalCompositeOperation = "source-over"
      }

      ctx.fill()

      if (drawingMode === "eraser") {
        ctx.globalCompositeOperation = "source-over"
      }
    }
  }

  const handleDrawing = (e: React.MouseEvent) => {
    if (!isDrawing || drawingMode === "none" || !lastPos) return

    const canvas = canvasRef.current
    if (!canvas || !pitchRef.current) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = pitchRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.beginPath()

    if (drawingMode === "pencil") {
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = strokeWidth
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.moveTo(lastPos.x, lastPos.y)
      ctx.lineTo(x, y)
      ctx.stroke()
    } else if (drawingMode === "eraser") {
      ctx.globalCompositeOperation = "destination-out"
      ctx.lineWidth = strokeWidth * 3 // Eraser is bigger
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.moveTo(lastPos.x, lastPos.y)
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.globalCompositeOperation = "source-over"
    }

    setLastPos({ x, y })
  }

  const clearDrawing = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const exportAsPNG = async () => {
    if (!pitchRef.current) return

    try {
      const canvas = await html2canvas(pitchRef.current, {
        backgroundColor: null,
        scale: 2, // Higher quality
      })

      const dataUrl = canvas.toDataURL("image/png")
      const link = document.createElement("a")
      link.download = "football-tactics.png"
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error("Error exporting as PNG:", error)
    }
  }

  // Lọc ra chỉ hiển thị cầu thủ chính thức (không phải dự bị)
  const activeHomePlayers = homeTeam.players.filter((p) => !p.isSubstitute)
  const activeAwayPlayers = awayTeam.players.filter((p) => !p.isSubstitute)

  return (
    <div className="relative">
      <div
        ref={pitchRef}
        className="relative w-full h-[500px] rounded-lg shadow-md overflow-hidden"
        onMouseDown={handleDrawingStart}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Sân cỏ với các dải cỏ đậm nhạt */}
        <div className="absolute inset-0 bg-green-600">
          {/* Dải cỏ ngang */}
          {Array.from({ length: 12 }).map((_, index) => (
            <div
              key={`horizontal-${index}`}
              className={`absolute h-[8.33%] w-full ${index % 2 === 0 ? "bg-green-700" : "bg-green-600"}`}
              style={{ top: `${index * 8.33}%` }}
            ></div>
          ))}

          {/* Dải cỏ dọc */}
          <div className="absolute inset-0 opacity-30">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`vertical-${index}`}
                className="absolute h-full w-[16.66%] bg-green-800"
                style={{ left: `${index * 16.66}%` }}
              ></div>
            ))}
          </div>

          {/* Hiệu ứng cắt cỏ hình tròn */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[30px] border-green-800"></div>
          </div>
        </div>

        {/* Canvas cho vẽ chiến thuật */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10" />

        {/* Sân bóng đá */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="w-[90%] h-[90%] border-2 border-white">
            {/* Vòng tròn giữa sân */}
            <div className="absolute top-1/2 left-1/2 w-[150px] h-[150px] border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2">
              <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            </div>

            {/* Khung thành trái */}
            <div className="absolute top-1/2 left-0 w-[100px] h-[200px] border-2 border-white -translate-y-1/2 -translate-x-0">
              <div className="absolute top-1/2 left-[50px] w-[50px] h-[100px] border-2 border-white rounded-full -translate-y-1/2 border-l-0"></div>
            </div>

            {/* Khung thành phải */}
            <div className="absolute top-1/2 right-0 w-[100px] h-[200px] border-2 border-white -translate-y-1/2 translate-x-0">
              <div className="absolute top-1/2 right-[50px] w-[50px] h-[100px] border-2 border-white rounded-full -translate-y-1/2 border-r-0"></div>
            </div>

            {/* Đường giữa sân */}
            <div className="absolute top-0 left-1/2 h-full w-0 border-l-2 border-white -translate-x-1/2"></div>

            {/* Chấm phạt đền trái */}
            <div className="absolute top-1/2 left-[70px] w-4 h-4 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>

            {/* Chấm phạt đền phải */}
            <div className="absolute top-1/2 right-[70px] w-4 h-4 bg-white rounded-full translate-x-1/2 -translate-y-1/2"></div>

            {/* Vùng góc sân */}
            <div className="absolute top-0 left-0 w-[20px] h-[20px] border-r-2 border-b-2 border-white rounded-br-[20px]"></div>
            <div className="absolute top-0 right-0 w-[20px] h-[20px] border-l-2 border-b-2 border-white rounded-bl-[20px]"></div>
            <div className="absolute bottom-0 left-0 w-[20px] h-[20px] border-r-2 border-t-2 border-white rounded-tr-[20px]"></div>
            <div className="absolute bottom-0 right-0 w-[20px] h-[20px] border-l-2 border-t-2 border-white rounded-tl-[20px]"></div>
          </div>
        </div>

        {/* Cầu thủ đội nhà */}
        {activeHomePlayers.map((player) => {
          const pos = positions[player.id] || { x: 250, y: 250 }
          return (
            <PlayerMarker
              key={player.id}
              player={player}
              position={pos}
              onMouseDown={(e) => handleMouseDown(e, player.id)}
              isDraggable={canDragPlayers}
            />
          )
        })}

        {/* Cầu thủ đội khách */}
        {activeAwayPlayers.map((player) => {
          const pos = positions[player.id] || { x: 250, y: 250 }
          return (
            <PlayerMarker
              key={player.id}
              player={player}
              position={pos}
              onMouseDown={(e) => handleMouseDown(e, player.id)}
              isDraggable={canDragPlayers}
            />
          )
        })}

        {/* Chỉ báo người dùng */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm flex items-center z-30">
          <span className="mr-1">👤</span> Chọn đội
        </div>
      </div>

      {/* Công cụ vẽ */}
      {drawingMode !== "none" && (
        <DrawingTools
          mode={drawingMode}
          onClear={clearDrawing}
          strokeWidth={strokeWidth}
          onStrokeWidthChange={setStrokeWidth}
          strokeColor={strokeColor}
          onStrokeColorChange={setStrokeColor}
        />
      )}

      {/* Nút xuất PNG */}
      <div className="mt-4 flex justify-end">
        <button
          id="export-button"
          onClick={exportAsPNG}
          className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-blue-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          Lưu dưới dạng PNG
        </button>
      </div>
    </div>
  )
}
