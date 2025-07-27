"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Filter, X, Search } from "lucide-react";
import { format } from "date-fns";
import { NotificationType, NotificationPriority } from "@/lib/types/notifications";
import { cn } from "@/lib/utils";

interface NotificationFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  activeFilters: FilterState;
}

export interface FilterState {
  search: string;
  type: NotificationType | "ALL";
  priority: NotificationPriority | "ALL";
  read: "ALL" | "READ" | "UNREAD";
  dateFrom?: Date;
  dateTo?: Date;
}

const initialFilters: FilterState = {
  search: "",
  type: "ALL",
  priority: "ALL",
  read: "ALL",
};

export function NotificationFilters({ onFiltersChange, activeFilters }: NotificationFiltersProps) {
  const [filters, setFilters] = useState<FilterState>(activeFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    onFiltersChange(initialFilters);
  };

  const hasActiveFilters = () => {
    return (
      filters.search !== "" ||
      filters.type !== "ALL" ||
      filters.priority !== "ALL" ||
      filters.read !== "ALL" ||
      filters.dateFrom ||
      filters.dateTo
    );
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search !== "") count++;
    if (filters.type !== "ALL") count++;
    if (filters.priority !== "ALL") count++;
    if (filters.read !== "ALL") count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    return count;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters() && (
              <Badge variant="secondary" className="px-2 py-1">
                {getActiveFilterCount()} active
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showAdvanced ? "Simple" : "Advanced"}
            </Button>
            {hasActiveFilters() && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search notifications</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by title, message, or sender..."
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        {/* Quick Filters */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.read}
              onValueChange={(value) => updateFilters({ read: value as FilterState["read"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="UNREAD">Unread</SelectItem>
                <SelectItem value="READ">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={filters.type}
              onValueChange={(value) => updateFilters({ type: value as FilterState["type"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="SYSTEM_ALERT">System Alerts</SelectItem>
                <SelectItem value="COURSE_UPDATE">Course Updates</SelectItem>
                <SelectItem value="ASSIGNMENT_DUE">Assignment Due</SelectItem>
                <SelectItem value="GRADE_POSTED">Grade Posted</SelectItem>
                <SelectItem value="MESSAGE_RECEIVED">Messages</SelectItem>
                <SelectItem value="COMMENT_REPLIED">Comment Replies</SelectItem>
                <SelectItem value="POST_LIKED">Post Likes</SelectItem>
                <SelectItem value="FOLLOW_REQUEST">Follow Requests</SelectItem>
                <SelectItem value="FRIEND_REQUEST">Friend Requests</SelectItem>
                <SelectItem value="EVENT_REMINDER">Event Reminders</SelectItem>
                <SelectItem value="JOB_APPLICATION">Job Applications</SelectItem>
                <SelectItem value="FREELANCE_PROPOSAL">Freelance Proposals</SelectItem>
                <SelectItem value="NEWS_PUBLISHED">News Updates</SelectItem>
                <SelectItem value="FEEDBACK_RESPONSE">Feedback Responses</SelectItem>
                <SelectItem value="ACHIEVEMENT_UNLOCKED">Achievements</SelectItem>
                <SelectItem value="PAYMENT_RECEIVED">Payment Notifications</SelectItem>
                <SelectItem value="ENROLLMENT_CONFIRMED">Enrollment Confirmations</SelectItem>
                <SelectItem value="CERTIFICATE_ISSUED">Certificate Issued</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={filters.priority}
                onValueChange={(value) => updateFilters({ priority: value as FilterState["priority"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Priorities</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? format(filters.dateFrom, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => updateFilters({ dateFrom: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? format(filters.dateTo, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => updateFilters({ dateTo: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {(filters.dateFrom || filters.dateTo) && (
              <div className="flex gap-2">
                {filters.dateFrom && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    From: {format(filters.dateFrom, "MMM dd")}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto w-auto p-0 hover:bg-transparent"
                      onClick={() => updateFilters({ dateFrom: undefined })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {filters.dateTo && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    To: {format(filters.dateTo, "MMM dd")}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto w-auto p-0 hover:bg-transparent"
                      onClick={() => updateFilters({ dateTo: undefined })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {/* Active Filter Tags */}
        {hasActiveFilters() && (
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium mb-2 block">Active Filters:</Label>
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: &quot;{filters.search.substring(0, 20)}{filters.search.length > 20 ? '...' : ''}&quot;
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto w-auto p-0 hover:bg-transparent"
                    onClick={() => updateFilters({ search: "" })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.type !== "ALL" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Type: {filters.type}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto w-auto p-0 hover:bg-transparent"
                    onClick={() => updateFilters({ type: "ALL" })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.priority !== "ALL" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Priority: {filters.priority}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto w-auto p-0 hover:bg-transparent"
                    onClick={() => updateFilters({ priority: "ALL" })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.read !== "ALL" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {filters.read}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto w-auto p-0 hover:bg-transparent"
                    onClick={() => updateFilters({ read: "ALL" })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
