import type { Formation, Player, Position } from "@/lib/types"

// Định nghĩa vị trí chuẩn cho từng sơ đồ chiến thuật
const formationPositions: Record<Formation, Record<string, { x: number; y: number }>> = {
  "4-4-2": {
    GK: { x: 10, y: 50 },
    LB: { x: 20, y: 20 },
    CB1: { x: 20, y: 40 },
    CB2: { x: 20, y: 60 },
    RB: { x: 20, y: 80 },
    LM: { x: 40, y: 20 },
    CM1: { x: 40, y: 40 },
    CM2: { x: 40, y: 60 },
    RM: { x: 40, y: 80 },
    ST1: { x: 70, y: 40 },
    ST2: { x: 70, y: 60 },
  },
  "4-3-3": {
    GK: { x: 10, y: 50 },
    LB: { x: 20, y: 20 },
    CB1: { x: 20, y: 40 },
    CB2: { x: 20, y: 60 },
    RB: { x: 20, y: 80 },
    DMF: { x: 40, y: 30 },
    CMF1: { x: 40, y: 50 },
    CMF2: { x: 40, y: 70 },
    LWF: { x: 70, y: 20 },
    CF: { x: 70, y: 50 },
    RWF: { x: 70, y: 80 },
  },
  "3-5-2": {
    GK: { x: 10, y: 50 },
    CB1: { x: 20, y: 30 },
    CB2: { x: 20, y: 50 },
    CB3: { x: 20, y: 70 },
    LWB: { x: 35, y: 15 },
    DMF: { x: 40, y: 50 },
    RWB: { x: 35, y: 85 },
    CMF1: { x: 50, y: 30 },
    CMF2: { x: 50, y: 70 },
    ST1: { x: 70, y: 40 },
    ST2: { x: 70, y: 60 },
  },
  "5-3-2": {
    GK: { x: 10, y: 50 },
    LWB: { x: 20, y: 10 },
    CB1: { x: 20, y: 30 },
    CB2: { x: 20, y: 50 },
    CB3: { x: 20, y: 70 },
    RWB: { x: 20, y: 90 },
    CMF1: { x: 45, y: 30 },
    DMF: { x: 45, y: 50 },
    CMF2: { x: 45, y: 70 },
    ST1: { x: 70, y: 40 },
    ST2: { x: 70, y: 60 },
  },
  "4-2-3-1": {
    GK: { x: 10, y: 50 },
    LB: { x: 20, y: 20 },
    CB1: { x: 20, y: 40 },
    CB2: { x: 20, y: 60 },
    RB: { x: 20, y: 80 },
    DMF1: { x: 35, y: 40 },
    DMF2: { x: 35, y: 60 },
    LWF: { x: 55, y: 20 },
    AMF: { x: 55, y: 50 },
    RWF: { x: 55, y: 80 },
    CF: { x: 75, y: 50 },
  },
  "3-4-3": {
    GK: { x: 10, y: 50 },
    CB1: { x: 20, y: 30 },
    CB2: { x: 20, y: 50 },
    CB3: { x: 20, y: 70 },
    LM: { x: 40, y: 20 },
    CM1: { x: 40, y: 40 },
    CM2: { x: 40, y: 60 },
    RM: { x: 40, y: 80 },
    LWF: { x: 70, y: 20 },
    CF: { x: 70, y: 50 },
    RWF: { x: 70, y: 80 },
  },
}

// Ánh xạ vị trí cho đội khách (đảo ngược)
function mapAwayPosition(position: { x: number; y: number }): { x: number; y: number } {
  return {
    x: 100 - position.x,
    y: position.y,
  }
}

export function generatePlayersFromFormation(formation: Formation, teamColor: string, teamId: string): Player[] {
  const players: Player[] = []
  const prefix = teamId || "player"
  const isHome = teamId === "home"

  // Lấy vị trí chuẩn cho sơ đồ
  const positions = formationPositions[formation]

  // Thủ môn
  players.push({
    id: `${prefix}-gk`,
    position: "GK",
    name: "Thủ môn",
    color: teamColor,
    image: "",
    positionKey: "GK",
  })

  // Phân tích sơ đồ
  const parts = formation.split("-").map(Number)

  // Hậu vệ
  const defenders = parts[0]
  for (let i = 0; i < defenders; i++) {
    let position: Position
    let name: string
    let positionKey: string

    if (defenders === 4) {
      if (i === 0) {
        position = "LB"
        name = "Hậu vệ trái"
        positionKey = "LB"
      } else if (i === 1) {
        position = "CB"
        name = "Trung vệ 1"
        positionKey = "CB1"
      } else if (i === 2) {
        position = "CB"
        name = "Trung vệ 2"
        positionKey = "CB2"
      } else {
        position = "RB"
        name = "Hậu vệ phải"
        positionKey = "RB"
      }
    } else if (defenders === 3) {
      if (i === 0) {
        position = "CB"
        name = "Trung vệ trái"
        positionKey = "CB1"
      } else if (i === 1) {
        position = "CB"
        name = "Trung vệ giữa"
        positionKey = "CB2"
      } else {
        position = "CB"
        name = "Trung vệ phải"
        positionKey = "CB3"
      }
    } else if (defenders === 5) {
      if (i === 0) {
        position = "LB"
        name = "Hậu vệ cánh trái"
        positionKey = "LWB"
      } else if (i === 1) {
        position = "CB"
        name = "Trung vệ trái"
        positionKey = "CB1"
      } else if (i === 2) {
        position = "CB"
        name = "Trung vệ giữa"
        positionKey = "CB2"
      } else if (i === 3) {
        position = "CB"
        name = "Trung vệ phải"
        positionKey = "CB3"
      } else {
        position = "RB"
        name = "Hậu vệ cánh phải"
        positionKey = "RWB"
      }
    } else {
      position = "CB"
      name = `Trung vệ ${i + 1}`
      positionKey = `CB${i + 1}`
    }

    players.push({
      id: `${prefix}-def-${i}`,
      position,
      name,
      color: teamColor,
      image: "",
      positionKey,
    })
  }

  // Tiền vệ
  const midfielders = parts[1]
  for (let i = 0; i < midfielders; i++) {
    let position: Position
    let name: string
    let positionKey: string

    if (formation === "4-4-2") {
      if (i === 0) {
        position = "LWF"
        name = "Tiền vệ cánh trái"
        positionKey = "LM"
      } else if (i === 1) {
        position = "CMF"
        name = "Tiền vệ trung tâm 1"
        positionKey = "CM1"
      } else if (i === 2) {
        position = "CMF"
        name = "Tiền vệ trung tâm 2"
        positionKey = "CM2"
      } else {
        position = "RWF"
        name = "Tiền vệ cánh phải"
        positionKey = "RM"
      }
    } else if (formation === "4-3-3") {
      if (i === 0) {
        position = "DMF"
        name = "Tiền vệ phòng ngự"
        positionKey = "DMF"
      } else if (i === 1) {
        position = "CMF"
        name = "Tiền vệ trung tâm 1"
        positionKey = "CMF1"
      } else {
        position = "CMF"
        name = "Tiền vệ trung tâm 2"
        positionKey = "CMF2"
      }
    } else if (formation === "3-5-2") {
      if (i === 0) {
        position = "LWF"
        name = "Tiền vệ cánh trái"
        positionKey = "LWB"
      } else if (i === 1) {
        position = "DMF"
        name = "Tiền vệ phòng ngự"
        positionKey = "DMF"
      } else if (i === 2) {
        position = "RWF"
        name = "Tiền vệ cánh phải"
        positionKey = "RWB"
      } else if (i === 3) {
        position = "CMF"
        name = "Tiền vệ trung tâm 1"
        positionKey = "CMF1"
      } else {
        position = "CMF"
        name = "Tiền vệ trung tâm 2"
        positionKey = "CMF2"
      }
    } else if (formation === "4-2-3-1" && midfielders === 2) {
      if (i === 0) {
        position = "DMF"
        name = "Tiền vệ phòng ngự 1"
        positionKey = "DMF1"
      } else {
        position = "DMF"
        name = "Tiền vệ phòng ngự 2"
        positionKey = "DMF2"
      }
    } else {
      position = "CMF"
      name = `Tiền vệ trung tâm ${i + 1}`
      positionKey = `CM${i + 1}`
    }

    players.push({
      id: `${prefix}-mid-${i}`,
      position,
      name,
      color: teamColor,
      image: "",
      positionKey,
    })
  }

  // Tiền đạo
  const forwards = parts[2] || 0
  for (let i = 0; i < forwards; i++) {
    let position: Position
    let name: string
    let positionKey: string

    if (formation === "4-3-3") {
      if (i === 0) {
        position = "LWF"
        name = "Tiền đạo cánh trái"
        positionKey = "LWF"
      } else if (i === 1) {
        position = "CF"
        name = "Tiền đạo trung tâm"
        positionKey = "CF"
      } else {
        position = "RWF"
        name = "Tiền đạo cánh phải"
        positionKey = "RWF"
      }
    } else if (formation === "4-4-2" || formation === "3-5-2" || formation === "5-3-2") {
      if (i === 0) {
        position = "CF"
        name = "Tiền đạo 1"
        positionKey = "ST1"
      } else {
        position = "CF"
        name = "Tiền đạo 2"
        positionKey = "ST2"
      }
    } else if (formation === "3-4-3") {
      if (i === 0) {
        position = "LWF"
        name = "Tiền đạo cánh trái"
        positionKey = "LWF"
      } else if (i === 1) {
        position = "CF"
        name = "Tiền đạo trung tâm"
        positionKey = "CF"
      } else {
        position = "RWF"
        name = "Tiền đạo cánh phải"
        positionKey = "RWF"
      }
    } else {
      position = "CF"
      name = `Tiền đạo ${i + 1}`
      positionKey = `ST${i + 1}`
    }

    players.push({
      id: `${prefix}-fwd-${i}`,
      position,
      name,
      color: teamColor,
      image: "",
      positionKey,
    })
  }

  // Nếu có phần thứ 4 (như trong 4-2-3-1)
  if (parts[3]) {
    const additionalForwards = parts[3]
    for (let i = 0; i < additionalForwards; i++) {
      let position: Position
      let name: string
      let positionKey: string

      if (formation === "4-2-3-1") {
        if (i === 0) {
          position = "LWF"
          name = "Tiền đạo cánh trái"
          positionKey = "LWF"
        } else if (i === 1) {
          position = "CF"
          name = "Tiền vệ tấn công"
          positionKey = "AMF"
        } else {
          position = "RWF"
          name = "Tiền đạo cánh phải"
          positionKey = "RWF"
        }
      } else {
        position = "CF"
        name = `Tiền đạo ${i + 1}`
        positionKey = `ST${i + 1}`
      }

      players.push({
        id: `${prefix}-add-fwd-${i}`,
        position,
        name,
        color: teamColor,
        image: "",
        positionKey,
      })
    }
  }

  // Phần thứ 5 (nếu có)
  if (parts[4]) {
    const lastForwards = parts[4]
    for (let i = 0; i < lastForwards; i++) {
      let position: Position = "CF"
      let name = `Tiền đạo ${i + 1}`
      let positionKey = "CF"

      if (formation === "4-2-3-1") {
        position = "CF"
        name = "Tiền đạo cắm"
        positionKey = "CF"
      }

      players.push({
        id: `${prefix}-last-fwd-${i}`,
        position,
        name,
        color: teamColor,
        image: "",
        positionKey,
      })
    }
  }

  return players
}

// Hàm để lấy vị trí cầu thủ dựa trên sơ đồ và vị trí
export function getPlayerPositionByFormation(
  formation: Formation,
  positionKey: string,
  teamId: "home" | "away",
): { x: number; y: number } {
  const positions = formationPositions[formation]
  const position = positions[positionKey]

  if (!position) {
    // Vị trí mặc định nếu không tìm thấy
    return teamId === "home" ? { x: 50, y: 50 } : { x: 50, y: 50 }
  }

  // Chuyển đổi từ phần trăm sang pixel (giả sử sân 500x500)
  const pixelPosition = {
    x: (position.x * 500) / 100,
    y: (position.y * 500) / 100,
  }

  // Đảo ngược vị trí cho đội khách
  return teamId === "home" ? pixelPosition : mapAwayPosition(position)
}
