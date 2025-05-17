"use client"

import { Button } from "@/components/ui/button"
import type { Formation } from "@/lib/types"

interface FormationSelectorProps {
  selectedFormation: Formation
  onFormationChange: (formation: Formation) => void
}

export default function FormationSelector({ selectedFormation, onFormationChange }: FormationSelectorProps) {
  const formations: Formation[] = ["4-4-2", "4-3-3", "3-5-2", "5-3-2", "4-2-3-1", "3-4-3"]

  return (
    <div className="grid grid-cols-3 gap-2">
      {formations.map((formation) => (
        <Button
          key={formation}
          variant={selectedFormation === formation ? "default" : "outline"}
          className={selectedFormation === formation ? "bg-blue-500 text-white" : ""}
          onClick={() => onFormationChange(formation)}
        >
          {formation}
        </Button>
      ))}
    </div>
  )
}
