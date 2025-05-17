"use client"

import { useState } from "react"
import { Calendar, Clock, MapPin, Trophy, Plus, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import type { Match } from "@/lib/types"

interface MatchScheduleProps {
  matches: Match[]
  onAddMatch: (match: Match) => void
  onUpdateMatch: (match: Match) => void
  onDeleteMatch: (id: string) => void
}

export default function MatchSchedule({ matches, onAddMatch, onUpdateMatch, onDeleteMatch }: MatchScheduleProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("all")

  // Mẫu trận đấu mới
  const newMatchTemplate: Match = {
    id: "",
    homeTeam: "",
    awayTeam: "",
    date: new Date().toISOString().split("T")[0],
    time: "19:00",
    venue: "",
    competition: "",
    completed: false,
  }

  const handleAddMatch = () => {
    setEditingMatch({
      ...newMatchTemplate,
      id: `match-${Date.now()}`,
    })
    setIsDialogOpen(true)
  }

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match)
    setIsDialogOpen(true)
  }

  const handleSaveMatch = () => {
    if (!editingMatch) return

    if (matches.some((match) => match.id === editingMatch.id)) {
      onUpdateMatch(editingMatch)
    } else {
      onAddMatch(editingMatch)
    }

    setIsDialogOpen(false)
    setEditingMatch(null)
  }

  const handleDeleteMatch = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa trận đấu này?")) {
      onDeleteMatch(id)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const filteredMatches = matches.filter((match) => {
    if (filter === "all") return true
    if (filter === "upcoming") return !match.completed
    if (filter === "completed") return match.completed
    return true
  })

  // Sắp xếp trận đấu: trận sắp tới lên đầu, trận đã hoàn thành xuống cuối
  const sortedMatches = [...filteredMatches].sort((a, b) => {
    if (a.completed && !b.completed) return 1
    if (!a.completed && b.completed) return -1
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Lịch thi đấu</h2>
        <Button onClick={handleAddMatch} className="bg-blue-500 hover:bg-blue-600">
          <Plus className="h-4 w-4 mr-2" /> Thêm trận đấu
        </Button>
      </div>

      <div className="flex space-x-2">
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
          Tất cả
        </Button>
        <Button variant={filter === "upcoming" ? "default" : "outline"} size="sm" onClick={() => setFilter("upcoming")}>
          Sắp diễn ra
        </Button>
        <Button
          variant={filter === "completed" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("completed")}
        >
          Đã kết thúc
        </Button>
      </div>

      {sortedMatches.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          Không có trận đấu nào {filter === "upcoming" ? "sắp diễn ra" : filter === "completed" ? "đã kết thúc" : ""}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMatches.map((match) => (
            <div
              key={match.id}
              className={`border rounded-lg p-4 ${
                match.completed ? "bg-gray-50" : "bg-white"
              } hover:shadow-md transition-shadow`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <Badge variant={match.completed ? "secondary" : "default"}>
                    {match.completed ? "Đã kết thúc" : "Sắp diễn ra"}
                  </Badge>
                  <div className="flex items-center mt-2 text-sm text-gray-500">
                    <Trophy className="h-4 w-4 mr-1" />
                    {match.competition}
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditMatch(match)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500"
                    onClick={() => handleDeleteMatch(match.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center mb-4">
                <div className="text-right flex-1">
                  <p className="font-bold text-lg">{match.homeTeam}</p>
                  {match.completed && <p className="text-2xl font-bold">{match.homeScore}</p>}
                </div>
                <div className="mx-4 text-center">
                  <p className="text-sm font-medium">VS</p>
                  {match.completed && <p className="text-lg font-bold">-</p>}
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-lg">{match.awayTeam}</p>
                  {match.completed && <p className="text-2xl font-bold">{match.awayScore}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {formatDate(match.date)}
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  {match.time}
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  {match.venue}
                </div>
              </div>

              {match.notes && (
                <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                  <p className="font-medium mb-1">Ghi chú:</p>
                  <p>{match.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMatch?.id.includes("match-") ? "Thêm trận đấu mới" : "Chỉnh sửa trận đấu"}
            </DialogTitle>
          </DialogHeader>
          {editingMatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="homeTeam">Đội nhà</Label>
                  <Input
                    id="homeTeam"
                    value={editingMatch.homeTeam}
                    onChange={(e) => setEditingMatch({ ...editingMatch, homeTeam: e.target.value })}
                    placeholder="Tên đội nhà"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="awayTeam">Đội khách</Label>
                  <Input
                    id="awayTeam"
                    value={editingMatch.awayTeam}
                    onChange={(e) => setEditingMatch({ ...editingMatch, awayTeam: e.target.value })}
                    placeholder="Tên đội khách"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Ngày thi đấu</Label>
                  <Input
                    id="date"
                    type="date"
                    value={editingMatch.date}
                    onChange={(e) => setEditingMatch({ ...editingMatch, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Giờ thi đấu</Label>
                  <Input
                    id="time"
                    type="time"
                    value={editingMatch.time}
                    onChange={(e) => setEditingMatch({ ...editingMatch, time: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Địa điểm</Label>
                <Input
                  id="venue"
                  value={editingMatch.venue}
                  onChange={(e) => setEditingMatch({ ...editingMatch, venue: e.target.value })}
                  placeholder="Sân vận động"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="competition">Giải đấu</Label>
                <Select
                  value={editingMatch.competition}
                  onValueChange={(value) => setEditingMatch({ ...editingMatch, competition: value })}
                >
                  <SelectTrigger id="competition">
                    <SelectValue placeholder="Chọn giải đấu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="V-League">V-League</SelectItem>
                    <SelectItem value="Cúp Quốc Gia">Cúp Quốc Gia</SelectItem>
                    <SelectItem value="AFC Champions League">AFC Champions League</SelectItem>
                    <SelectItem value="Giao hữu">Giao hữu</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="completed"
                  checked={editingMatch.completed}
                  onCheckedChange={(checked) => setEditingMatch({ ...editingMatch, completed: checked })}
                />
                <Label htmlFor="completed">Đã kết thúc</Label>
              </div>

              {editingMatch.completed && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="homeScore">Bàn thắng đội nhà</Label>
                    <Input
                      id="homeScore"
                      type="number"
                      min={0}
                      value={editingMatch.homeScore || 0}
                      onChange={(e) =>
                        setEditingMatch({ ...editingMatch, homeScore: Number.parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="awayScore">Bàn thắng đội khách</Label>
                    <Input
                      id="awayScore"
                      type="number"
                      min={0}
                      value={editingMatch.awayScore || 0}
                      onChange={(e) =>
                        setEditingMatch({ ...editingMatch, awayScore: Number.parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Ghi chú</Label>
                <Textarea
                  id="notes"
                  value={editingMatch.notes || ""}
                  onChange={(e) => setEditingMatch({ ...editingMatch, notes: e.target.value })}
                  placeholder="Thông tin thêm về trận đấu"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleSaveMatch}>Lưu</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
