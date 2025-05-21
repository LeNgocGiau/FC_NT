"use client"

import { useState, useEffect } from "react"
import { Star, Trophy, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Player, Team, Match } from "@/lib/types"

interface PlayerRating {
  playerId: string
  score: number
  isMVP?: boolean
}

interface PlayerRatingsData {
  matchId: string
  homeTeamRatings: PlayerRating[]
  awayTeamRatings: PlayerRating[]
  homeMVP?: string
  awayMVP?: string
}

interface PlayerRatingProps {
  match: Match
  homeTeam: Team
  awayTeam: Team
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaveRatings: (ratings: PlayerRatingsData) => void
}

export default function PlayerRating({ match, homeTeam, awayTeam, open, onOpenChange, onSaveRatings }: PlayerRatingProps) {
  const [homeTeamRatings, setHomeTeamRatings] = useState<PlayerRating[]>([])
  const [awayTeamRatings, setAwayTeamRatings] = useState<PlayerRating[]>([])
  const [homeMVP, setHomeMVP] = useState<string | undefined>()
  const [awayMVP, setAwayMVP] = useState<string | undefined>()

  // Initialize ratings when dialog opens
  useEffect(() => {
    if (open) {
      const initialHomeRatings = homeTeam.players
        .filter(player => !player.isSubstitute)
        .map(player => ({
          playerId: player.id,
          score: 0
        }))

      const initialAwayRatings = awayTeam.players
        .filter(player => !player.isSubstitute)
        .map(player => ({
          playerId: player.id,
          score: 0
        }))

      setHomeTeamRatings(initialHomeRatings)
      setAwayTeamRatings(initialAwayRatings)
      setHomeMVP(undefined)
      setAwayMVP(undefined)
    }
  }, [open, homeTeam.players, awayTeam.players])

  const handleRating = (playerId: string, score: number, isHomeTeam: boolean) => {
    if (isHomeTeam) {
      setHomeTeamRatings(ratings => 
        ratings.map(rating => 
          rating.playerId === playerId ? { ...rating, score } : rating
        )
      )
    } else {
      setAwayTeamRatings(ratings => 
        ratings.map(rating => 
          rating.playerId === playerId ? { ...rating, score } : rating
        )
      )
    }
  }

  const handleSetMVP = (playerId: string, isHomeTeam: boolean) => {
    if (isHomeTeam) {
      setHomeMVP(homeMVP === playerId ? undefined : playerId)
    } else {
      setAwayMVP(awayMVP === playerId ? undefined : playerId)
    }
  }

  const handleSave = () => {
    const ratings: PlayerRatingsData = {
      matchId: match.id,
      homeTeamRatings: homeTeamRatings.map(rating => ({
        ...rating,
        isMVP: rating.playerId === homeMVP
      })),
      awayTeamRatings: awayTeamRatings.map(rating => ({
        ...rating,
        isMVP: rating.playerId === awayMVP
      })),
      homeMVP,
      awayMVP
    }
    onSaveRatings(ratings)
    onOpenChange(false)
  }

  // Function to find player by ID
  const findPlayer = (id: string, isHomeTeam: boolean): Player | undefined => {
    return isHomeTeam 
      ? homeTeam.players.find(p => p.id === id)
      : awayTeam.players.find(p => p.id === id)
  }

  // Render star ratings
  const renderStars = (playerId: string, currentScore: number, isHomeTeam: boolean) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 cursor-pointer ${
              star <= currentScore ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
            }`}
            onClick={() => handleRating(playerId, star, isHomeTeam)}
          />
        ))}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Đánh giá trận đấu</DialogTitle>
        </DialogHeader>

        <div className="mb-6">
          <div className="flex justify-between items-center bg-gray-100 p-3 rounded-lg">
            <div className="text-lg font-bold">{match.homeTeam}</div>
            <div className="flex space-x-2 items-center">
              <span className="text-xl font-bold text-blue-600">{match.homeScore || 0}</span>
              <span>-</span>
              <span className="text-xl font-bold text-red-600">{match.awayScore || 0}</span>
            </div>
            <div className="text-lg font-bold">{match.awayTeam}</div>
          </div>
          <div className="text-sm text-gray-500 text-center mt-2">
            {match.date} • {match.venue} • {match.competition}
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-8">
          {/* MVP Section */}
          <div className="bg-yellow-100 p-4 rounded-lg">
            <h3 className="font-bold flex items-center mb-3">
              <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
              MVP Đội nhà
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {homeTeamRatings.map(rating => {
                const player = findPlayer(rating.playerId, true)
                if (!player) return null
                
                return (
                  <div 
                    key={rating.playerId} 
                    className={`flex items-center p-2 rounded-md cursor-pointer ${
                      homeMVP === rating.playerId ? "bg-yellow-200 border border-yellow-400" : ""
                    }`}
                    onClick={() => handleSetMVP(rating.playerId, true)}
                  >
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mr-2">
                      {player.position}
                    </div>
                    <div className="flex-1">
                      {player.name}
                      <div className="text-xs text-gray-600">{player.position} #{player.number || ""}</div>
                    </div>
                    {homeMVP === rating.playerId && (
                      <Badge className="bg-yellow-500">MVP</Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-purple-100 p-4 rounded-lg">
            <h3 className="font-bold flex items-center mb-3">
              <Trophy className="h-5 w-5 mr-2 text-purple-600" />
              MVP Đội khách
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {awayTeamRatings.map(rating => {
                const player = findPlayer(rating.playerId, false)
                if (!player) return null
                
                return (
                  <div 
                    key={rating.playerId} 
                    className={`flex items-center p-2 rounded-md cursor-pointer ${
                      awayMVP === rating.playerId ? "bg-purple-200 border border-purple-400" : ""
                    }`}
                    onClick={() => handleSetMVP(rating.playerId, false)}
                  >
                    <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center mr-2">
                      {player.position}
                    </div>
                    <div className="flex-1">
                      {player.name}
                      <div className="text-xs text-gray-600">{player.position} #{player.number || ""}</div>
                    </div>
                    {awayMVP === rating.playerId && (
                      <Badge className="bg-purple-500">MVP</Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold text-lg mb-3">Đánh giá cầu thủ</h3>
          
          <div className="space-y-8">
            {/* Home Team Ratings */}
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600">{match.homeTeam}</h4>
              <div className="bg-white border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-3">Thứ hạng</th>
                      <th className="text-left py-2 px-3">Cầu thủ</th>
                      <th className="text-center py-2 px-3">Vị trí</th>
                      <th className="text-center py-2 px-3">Điểm</th>
                      <th className="text-center py-2 px-3">Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {homeTeamRatings
                      .sort((a, b) => b.score - a.score)
                      .map((rating, index) => {
                        const player = findPlayer(rating.playerId, true)
                        if (!player) return null
                        
                        return (
                          <tr key={rating.playerId} className="border-t">
                            <td className="py-2 px-3">{index + 1}</td>
                            <td className="py-2 px-3 flex items-center">
                              <div className={`w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white mr-2 ${
                                homeMVP === rating.playerId ? "bg-yellow-500" : ""
                              }`}>
                                {player.number || player.position}
                              </div>
                              {player.name}
                            </td>
                            <td className="py-2 px-3 text-center">{player.position}</td>
                            <td className="py-2 px-3 text-center font-bold">{rating.score || "0.0"}</td>
                            <td className="py-2 px-3">
                              {renderStars(rating.playerId, rating.score, true)}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Away Team Ratings */}
            <div className="space-y-2">
              <h4 className="font-medium text-red-600">{match.awayTeam}</h4>
              <div className="bg-white border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-3">Thứ hạng</th>
                      <th className="text-left py-2 px-3">Cầu thủ</th>
                      <th className="text-center py-2 px-3">Vị trí</th>
                      <th className="text-center py-2 px-3">Điểm</th>
                      <th className="text-center py-2 px-3">Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {awayTeamRatings
                      .sort((a, b) => b.score - a.score)
                      .map((rating, index) => {
                        const player = findPlayer(rating.playerId, false)
                        if (!player) return null
                        
                        return (
                          <tr key={rating.playerId} className="border-t">
                            <td className="py-2 px-3">{index + 1}</td>
                            <td className="py-2 px-3 flex items-center">
                              <div className={`w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white mr-2 ${
                                awayMVP === rating.playerId ? "bg-purple-500" : ""
                              }`}>
                                {player.number || player.position}
                              </div>
                              {player.name}
                            </td>
                            <td className="py-2 px-3 text-center">{player.position}</td>
                            <td className="py-2 px-3 text-center font-bold">{rating.score || "0.0"}</td>
                            <td className="py-2 px-3">
                              {renderStars(rating.playerId, rating.score, false)}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button className="bg-blue-500 hover:bg-blue-600" onClick={handleSave}>
            Lưu đánh giá
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 