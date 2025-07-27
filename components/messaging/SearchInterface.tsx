'use client';

// ==========================================
// SEARCH INTERFACE COMPONENT
// ==========================================
// Advanced search for messages, media, files, links

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Search,
  X,
  Filter,
  Calendar,
  Image,
  Video,
  File,
  Link,
  MessageSquare,
  Clock,
  User,
  ArrowRight
} from 'lucide-react';

interface SearchResult {
  id: string;
  messageId: string;
  conversationId: string;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'LOCATION' | 'STICKER' | 'GIF';
  senderName: string;
  senderAvatar?: string;
  createdAt: string;
  context: string;
  mediaUrls?: string[];
  highlighted?: string;
}

interface SearchFilters {
  messageType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'LOCATION' | 'ALL';
  dateRange?: 'today' | 'week' | 'month' | 'year' | 'all';
  sender?: string;
}

interface SearchInterfaceProps {
  conversationId?: string;
  onClose: () => void;
  onMessageSelect: (messageId: string) => void;
  className?: string;
}

export function SearchInterface({
  conversationId,
  onClose,
  onMessageSelect,
  className
}: SearchInterfaceProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    messageType: 'ALL',
    dateRange: 'all'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Debounced search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (searchQuery: string, searchFilters: SearchFilters) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        ...(conversationId && { conversationId }),
        ...(searchFilters.messageType !== 'ALL' && { messageType: searchFilters.messageType! }),
        ...(searchFilters.dateRange !== 'all' && { dateRange: searchFilters.dateRange! }),
        ...(searchFilters.sender && { sender: searchFilters.sender })
      });

      const response = await fetch(`/api/messages/search?${params}`);
      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setResults(data.results || []);

      // Save to recent searches
      if (searchQuery.trim()) {
        setRecentSearches(prev => {
          const updated = [searchQuery, ...prev.filter(s => s !== searchQuery)].slice(0, 5);
          localStorage.setItem('messageSearchHistory', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('messageSearchHistory');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (query.trim()) {
      const timeout = setTimeout(() => {
        performSearch(query, filters);
      }, 300);
      setSearchTimeout(timeout);
    } else {
      setResults([]);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [query, filters, performSearch]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'IMAGE':
        return <Image className="w-4 h-4" />;
      case 'VIDEO':
        return <Video className="w-4 h-4" />;
      case 'AUDIO':
        return <File className="w-4 h-4" />;
      case 'FILE':
        return <File className="w-4 h-4" />;
      case 'LOCATION':
        return <div className="w-4 h-4">📍</div>;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight) return text;
    
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800">{part}</mark>
      ) : (
        part
      )
    );
  };

  return (
    <Card className={cn("border-t-0 rounded-t-none", className)}>
      <CardContent className="p-0">
        {/* Search Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search messages..."
                className="pl-10 pr-10"
              />
              {query && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearSearch}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 w-6 h-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "bg-gray-100 dark:bg-gray-800")}
            >
              <Filter className="w-4 h-4" />
            </Button>
            
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Type:</span>
                  {['ALL', 'TEXT', 'IMAGE', 'VIDEO', 'FILE'].map((type) => (
                    <Button
                      key={type}
                      size="sm"
                      variant={filters.messageType === type ? "default" : "outline"}
                      onClick={() => handleFilterChange('messageType', type)}
                      className="text-xs"
                    >
                      {type === 'ALL' ? 'All' : type.toLowerCase()}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Date:</span>
                  {[
                    { key: 'all', label: 'All time' },
                    { key: 'today', label: 'Today' },
                    { key: 'week', label: 'This week' },
                    { key: 'month', label: 'This month' },
                  ].map((option) => (
                    <Button
                      key={option.key}
                      size="sm"
                      variant={filters.dateRange === option.key ? "default" : "outline"}
                      onClick={() => handleFilterChange('dateRange', option.key)}
                      className="text-xs"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Recent searches
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="ghost"
                    onClick={() => setQuery(search)}
                    className="text-xs h-auto py-1 px-2"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {search}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search Results */}
        <ScrollArea className="h-96">
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-sm text-gray-500">Searching...</span>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                </div>
                
                {results.map((result) => (
                  <Card
                    key={result.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => onMessageSelect(result.messageId)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={result.senderAvatar} />
                          <AvatarFallback className="text-xs">
                            {result.senderName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {result.senderName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(result.createdAt)}
                            </span>
                            {getMessageTypeIcon(result.messageType)}
                          </div>
                          
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {result.messageType === 'TEXT' ? (
                              <span>{highlightText(result.content, query)}</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                {getMessageTypeIcon(result.messageType)}
                                <span className="capitalize">
                                  {result.messageType.toLowerCase()} message
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {result.context && (
                            <div className="text-xs text-gray-500 mt-1">
                              ...{highlightText(result.context, query)}...
                            </div>
                          )}
                        </div>
                        
                        <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : query.trim() ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <div className="text-sm">No messages found</div>
                <div className="text-xs mt-1">
                  Try adjusting your search terms or filters
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <div className="text-sm">Search through your messages</div>
                <div className="text-xs mt-1">
                  Find text, images, files, and more
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
