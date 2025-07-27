'use client';

import React, { useState } from 'react';
import { BookOpen, GraduationCap, Users, Building, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { EducationalContext } from '../core/types';

interface EducationalContextPickerProps {
  value?: EducationalContext;
  onChange?: (context: EducationalContext) => void;
  placeholder?: string;
  className?: string;
}

const academicLevels = [
  { value: 'elementary', label: 'Elementary' },
  { value: 'middle', label: 'Middle School' },
  { value: 'high', label: 'High School' },
  { value: 'undergrad', label: 'Undergraduate' },
  { value: 'grad', label: 'Graduate' },
  { value: 'phd', label: 'PhD' },
];

const popularSubjects = [
  'Mathematics', 'Science', 'English', 'History', 'Computer Science',
  'Physics', 'Chemistry', 'Biology', 'Literature', 'Art', 'Music',
  'Psychology', 'Economics', 'Political Science', 'Philosophy'
];

export default function EducationalContextPicker({
  value = {},
  onChange,
  placeholder = "Add educational context...",
  className
}: EducationalContextPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localContext, setLocalContext] = useState<EducationalContext>(value);

  const updateContext = (updates: Partial<EducationalContext>) => {
    const newContext = { ...localContext, ...updates };
    setLocalContext(newContext);
    if (onChange) {
      onChange(newContext);
    }
  };

  const removeTag = (index: number) => {
    const newTags = localContext.tags?.filter((_, i) => i !== index) || [];
    updateContext({ tags: newTags });
  };

  const addTag = (tag: string) => {
    if (!tag.trim()) return;
    const newTags = [...(localContext.tags || []), tag.trim()];
    updateContext({ tags: newTags });
  };

  const hasContext = localContext.subject || localContext.course || localContext.level || 
    localContext.institution || (localContext.tags && localContext.tags.length > 0);

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !hasContext && "text-muted-foreground"
            )}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            {hasContext ? (
              <div className="flex flex-wrap gap-1">
                {localContext.subject && (
                  <Badge variant="secondary" className="text-xs">{localContext.subject}</Badge>
                )}
                {localContext.level && (
                  <Badge variant="secondary" className="text-xs">{localContext.level}</Badge>
                )}
                {localContext.course && (
                  <Badge variant="secondary" className="text-xs">{localContext.course}</Badge>
                )}
              </div>
            ) : (
              placeholder
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select
                value={localContext.subject || ''}
                onValueChange={(value) => updateContext({ subject: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {popularSubjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">Academic Level</Label>
              <Select
                value={localContext.level || ''}
                onValueChange={(value: any) => updateContext({ level: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {academicLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              <Input
                id="course"
                placeholder="e.g., Calculus I, Organic Chemistry"
                value={localContext.course || ''}
                onChange={(e) => updateContext({ course: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution">Institution</Label>
              <Input
                id="institution"
                placeholder="e.g., Harvard University, MIT"
                value={localContext.institution || ''}
                onChange={(e) => updateContext({ institution: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="studyGroup">Study Group</Label>
              <Input
                id="studyGroup"
                placeholder="e.g., Physics Study Group, CS Homework Help"
                value={localContext.studyGroup || ''}
                onChange={(e) => updateContext({ studyGroup: e.target.value })}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {localContext.tags?.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                    <button
                      onClick={() => removeTag(index)}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addTag(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={(e) => {
                    const input = e.currentTarget.parentElement?.querySelector('input');
                    if (input) {
                      addTag(input.value);
                      input.value = '';
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLocalContext({});
                  if (onChange) onChange({});
                }}
              >
                Clear All
              </Button>
              <Button
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Display selected context */}
      {hasContext && (
        <div className="flex flex-wrap gap-1">
          {localContext.subject && (
            <Badge variant="outline" className="text-xs">
              <BookOpen className="mr-1 h-3 w-3" />
              {localContext.subject}
            </Badge>
          )}
          {localContext.level && (
            <Badge variant="outline" className="text-xs">
              <GraduationCap className="mr-1 h-3 w-3" />
              {academicLevels.find(l => l.value === localContext.level)?.label}
            </Badge>
          )}
          {localContext.course && (
            <Badge variant="outline" className="text-xs">
              📖 {localContext.course}
            </Badge>
          )}
          {localContext.studyGroup && (
            <Badge variant="outline" className="text-xs">
              <Users className="mr-1 h-3 w-3" />
              {localContext.studyGroup}
            </Badge>
          )}
          {localContext.institution && (
            <Badge variant="outline" className="text-xs">
              <Building className="mr-1 h-3 w-3" />
              {localContext.institution}
            </Badge>
          )}
          {localContext.tags?.map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
