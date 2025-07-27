"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Smile, 
  Heart, 
  Coffee, 
  Car, 
  Gamepad2, 
  Flag,
  Search
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  className?: string
}

const EMOJI_CATEGORIES = {
  recent: {
    name: 'Recently Used',
    icon: Smile,
    emojis: ['😀', '😂', '🥰', '😍', '🤔', '👍', '❤️', '🔥']
  },
  smileys: {
    name: 'Smileys & People',
    icon: Smile,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊',
      '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
      '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏',
      '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
      '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐',
      '👶', '🧒', '👦', '👧', '🧑', '👨', '👩', '🧓', '👴', '👵', '👮', '🕵️',
      '💂', '👷', '🤴', '👸', '👳', '👲', '🧕', '🤵', '👰', '🤰', '🤱', '👼'
    ]
  },
  animals: {
    name: 'Animals & Nature',
    icon: Heart,
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
      '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤',
      '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛',
      '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎',
      '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳',
      '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪'
    ]
  },
  food: {
    name: 'Food & Drink',
    icon: Coffee,
    emojis: [
      '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑',
      '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑',
      '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨',
      '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭',
      '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘',
      '🫕', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚'
    ]
  },
  activities: {
    name: 'Activities',
    icon: Gamepad2,
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓',
      '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿',
      '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️',
      '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣',
      '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫',
      '🎟️', '🎪', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶'
    ]
  },
  travel: {
    name: 'Travel & Places',
    icon: Car,
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚',
      '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '🛸', '✈️', '🛩️',
      '🪂', '🚀', '🛰️', '💺', '🛶', '⛵', '🚤', '🛥️', '🚢', '⚓', '⛽', '🚧',
      '🚦', '🚥', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢',
      '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺',
      '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦'
    ]
  },
  flags: {
    name: 'Flags',
    icon: Flag,
    emojis: [
      '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇦🇫', '🇦🇽',
      '🇦🇱', '🇩🇿', '🇦🇸', '🇦🇩', '🇦🇴', '🇦🇮', '🇦🇶', '🇦🇬', '🇦🇷', '🇦🇲',
      '🇦🇼', '🇦🇺', '🇦🇹', '🇦🇿', '🇧🇸', '🇧🇭', '🇧🇩', '🇧🇧', '🇧🇾', '🇧🇪',
      '🇧🇿', '🇧🇯', '🇧🇲', '🇧🇹', '🇧🇴', '🇧🇦', '🇧🇼', '🇧🇷', '🇮🇴', '🇻🇬',
      '🇧🇳', '🇧🇬', '🇧🇫', '🇧🇮', '🇰🇭', '🇨🇲', '🇨🇦', '🇮🇨', '🇨🇻', '🇧🇶',
      '🇰🇾', '🇨🇫', '🇹🇩', '🇨🇱', '🇨🇳', '🇨🇽', '🇨🇨', '🇨🇴', '🇰🇲', '🇨🇬'
    ]
  }
}

const REACTION_EMOJIS = [
  { emoji: '👍', name: 'thumbs_up' },
  { emoji: '❤️', name: 'heart' },
  { emoji: '😂', name: 'laugh' },
  { emoji: '😮', name: 'wow' },
  { emoji: '😢', name: 'sad' },
  { emoji: '😠', name: 'angry' },
  { emoji: '🔥', name: 'fire' },
  { emoji: '🎉', name: 'party' },
]

export function EmojiPicker({ onEmojiSelect, className }: EmojiPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('recent-emojis')
      return stored ? JSON.parse(stored) : ['😀', '😂', '🥰', '😍', '🤔', '👍', '❤️', '🔥']
    }
    return ['😀', '😂', '🥰', '😍', '🤔', '👍', '❤️', '🔥']
  })

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji)
    
    // Update recent emojis
    const updatedRecent = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 8)
    setRecentEmojis(updatedRecent)
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('recent-emojis', JSON.stringify(updatedRecent))
    }
  }

  const filteredEmojis = (emojis: string[]) => {
    if (!searchQuery) return emojis
    return emojis.filter(emoji => {
      // Simple search - you could implement more sophisticated emoji name matching
      return emoji.includes(searchQuery)
    })
  }

  return (
    <div className={cn("w-80 h-96 bg-background border rounded-lg shadow-lg", className)}>
      {/* Quick Reactions */}
      <div className="p-3 border-b">
        <div className="text-xs font-medium text-muted-foreground mb-2">Quick Reactions</div>
        <div className="flex gap-1">
          {REACTION_EMOJIS.map(({ emoji, name }) => (
            <Button
              key={name}
              variant="ghost"
              size="sm"
              onClick={() => handleEmojiClick(emoji)}
              className="h-8 w-8 p-0 hover:bg-muted/50"
            >
              <span className="text-lg">{emoji}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emojis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-8"
          />
        </div>
      </div>

      {/* Emoji Categories */}
      <Tabs defaultValue="recent" className="flex-1">
        <TabsList className="grid w-full grid-cols-6 h-10 p-1 m-2">
          {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => (
            <TabsTrigger
              key={key}
              value={key}
              className="h-8 w-full p-0"
              title={category.name}
            >
              <category.icon className="h-4 w-4" />
            </TabsTrigger>
          ))}
        </TabsList>

        <ScrollArea className="h-64 px-2">
          {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => (
            <TabsContent key={key} value={key} className="mt-0">
              <div className="grid grid-cols-8 gap-1 p-1">
                {filteredEmojis(key === 'recent' ? recentEmojis : category.emojis).map((emoji, index) => (
                  <Button
                    key={`${emoji}-${index}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEmojiClick(emoji)}
                    className="h-8 w-8 p-0 hover:bg-muted/50 text-lg"
                    title={emoji}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </TabsContent>
          ))}
        </ScrollArea>
      </Tabs>
    </div>
  )
}

// Simplified Emoji Button for message reactions
interface EmojiReactionButtonProps {
  emoji: string
  count: number
  isActive?: boolean
  onClick: () => void
  className?: string
}

export function EmojiReactionButton({ 
  emoji, 
  count, 
  isActive = false, 
  onClick, 
  className 
}: EmojiReactionButtonProps) {
  return (
    <Button
      variant={isActive ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className={cn(
        "h-6 px-2 gap-1 text-xs hover:scale-105 transition-transform",
        isActive && "bg-primary/10 border-primary text-primary",
        className
      )}
    >
      <span className="text-sm">{emoji}</span>
      {count > 0 && <span className="font-medium">{count}</span>}
    </Button>
  )
}
