'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, User, BookOpen, Users, FileText, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Post, UserProfile, Group, SearchFilters } from '../core/types';
import PostCard from '../feed/PostCard';
import GroupCard from '../groups/GroupCard';

interface SearchResult {
  posts: Post[];
  users: UserProfile[];
  groups: Group[];
  totalResults: number;
}

interface AdvancedSearchProps {
  onSearch?: (query: string, filters: SearchFilters) => void;
  className?: string;
}

export default function AdvancedSearch({
  onSearch,
  className
}: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult>({
    posts: [],
    users: [],
    groups: [],
    totalResults: 0
  });
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    type: 'all',
    educationalContext: {},
    sortBy: 'relevant'
  });

  // Debounced search
  const debounceTimer = React.useRef<NodeJS.Timeout | null>(null);
  
  const debouncedSearch = useCallback((searchQuery: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
  }, []);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({
        posts: [],
        users: [],
        groups: [],
        totalResults: 0
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Mock search results
      const mockResults: SearchResult = {
        posts: [
          {
            id: '1',
            author: {
              id: '1',
              name: 'Sarah Chen',
              username: 'sarahc',
              image: '/api/placeholder/40/40',
              verified: true,
              role: 'student'
            },
            content: `Just solved a challenging calculus problem! The key insight was using ${searchQuery} to simplify the integration. Anyone else working on similar problems?`,
            educationalContext: {
              subject: 'Mathematics',
              course: 'Calculus II',
              level: 'undergrad'
            },
            _count: {
              likes: 23,
              comments: 8,
              shares: 3,
              views: 156
            },
            isLiked: false,
            isBookmarked: false,
            privacy: 'public',
            createdAt: '2024-06-14T10:30:00Z',
            updatedAt: '2024-06-14T10:30:00Z'
          }
        ],
        users: [
          {
            id: '2',
            name: 'Alex Rodriguez',
            username: 'alexr',
            image: '/api/placeholder/40/40',
            bio: `Computer Science student passionate about ${searchQuery} and machine learning.`,
            verified: false,
            role: 'student',
            institution: 'MIT',
            _count: {
              posts: 47,
              followers: 234,
              following: 189,
              totalLikes: 1205,
              achievements: 12
            },
            achievements: [],
            isFollowing: false,
            isBlocked: false,
            lastActive: '2024-06-14T08:15:00Z',
            joinedAt: '2024-01-15T10:00:00Z'
          }
        ],
        groups: [
          {
            id: '3',
            name: `${searchQuery} Study Group`,
            description: `A collaborative learning community focused on ${searchQuery} and related topics.`,
            privacy: 'PUBLIC',
            groupType: 'PUBLIC',
            visibility: 'VISIBLE',
            category: 'Academic',
            tags: [searchQuery, 'study', 'collaboration'],
            memberCount: 89,
            postCount: 234,
            activeMembers: 45,
            _count: {
              members: 89,
              posts: 234
            },
            isJoined: false,
            createdAt: '2024-02-20T14:00:00Z',
            updatedAt: '2024-06-14T12:15:00Z'
          }
        ],
        totalResults: 47
      };

      setResults(mockResults);
      onSearch?.(searchQuery, { ...filters, query: searchQuery });
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    debouncedSearch(query);
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, debouncedSearch]);

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    if (query.trim()) {
      performSearch(query);
    }
  };

  const getResultCount = (type: string) => {
    switch (type) {
      case 'posts':
        return results.posts.length;
      case 'users':
        return results.users.length;
      case 'groups':
        return results.groups.length;
      default:
        return results.totalResults;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return `${Math.floor(diffInDays / 7)}w ago`;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Search Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Search</h1>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for posts, users, groups, or topics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 text-base"
            autoFocus
          />
        </div>

        {/* Advanced Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                value={filters.educationalContext?.subject || 'all'}
                onValueChange={(value) => handleFilterChange('educationalContext', { 
                  ...filters.educationalContext, 
                  subject: value === 'all' ? undefined : value 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  <SelectItem value="Mathematics">Mathematics</SelectItem>
                  <SelectItem value="Science">Science</SelectItem>
                  <SelectItem value="Computer Science">Computer Science</SelectItem>
                  <SelectItem value="Physics">Physics</SelectItem>
                  <SelectItem value="Chemistry">Chemistry</SelectItem>
                  <SelectItem value="Biology">Biology</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.educationalContext?.level || 'all'}
                onValueChange={(value) => handleFilterChange('educationalContext', { 
                  ...filters.educationalContext, 
                  level: value === 'all' ? undefined : value 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="elementary">Elementary</SelectItem>
                  <SelectItem value="middle">Middle School</SelectItem>
                  <SelectItem value="high">High School</SelectItem>
                  <SelectItem value="undergrad">Undergraduate</SelectItem>
                  <SelectItem value="grad">Graduate</SelectItem>
                  <SelectItem value="phd">PhD</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.sortBy || 'relevant'}
                onValueChange={(value: any) => handleFilterChange('sortBy', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevant">Most Relevant</SelectItem>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="trending">Trending</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => {
                setFilters({
                  query: '',
                  type: 'all',
                  educationalContext: {},
                  sortBy: 'relevant'
                });
                if (query.trim()) performSearch(query);
              }}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Results */}
      {query.trim() && (
        <div className="space-y-4">
          {/* Results Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {isLoading ? 'Searching...' : `${results.totalResults} results found`}
              </span>
              {query && (
                <Badge variant="secondary">
                  &quot;{query}&quot;
                </Badge>
              )}
            </div>
            
            {!isLoading && results.totalResults > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Sorted by {filters.sortBy}</span>
              </div>
            )}
          </div>

          {/* Results Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                All ({results.totalResults})
              </TabsTrigger>
              <TabsTrigger value="posts">
                Posts ({results.posts.length})
              </TabsTrigger>
              <TabsTrigger value="users">
                Users ({results.users.length})
              </TabsTrigger>
              <TabsTrigger value="groups">
                Groups ({results.groups.length})
              </TabsTrigger>
            </TabsList>

            {/* All Results */}
            <TabsContent value="all" className="mt-6 space-y-6">
              {results.posts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Posts
                  </h3>
                  <div className="space-y-4">
                    {results.posts.slice(0, 3).map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                </div>
              )}

              {results.users.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Users
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.users.slice(0, 4).map((user) => (
                      <Card key={user.id} className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={user.image} />
                              <AvatarFallback>
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold truncate">{user.name}</h4>
                                {user.verified && (
                                  <Badge variant="secondary" className="text-xs">Verified</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">@{user.username}</p>
                              {user.bio && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                  {user.bio}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>{user._count.followers} followers</span>
                                <span>{user._count.posts} posts</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {results.groups.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Study Groups
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {results.groups.slice(0, 3).map((group) => (
                      <GroupCard key={group.id} group={group} showJoinButton />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Posts Results */}
            <TabsContent value="posts" className="mt-6">
              <div className="space-y-4">
                {results.posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </TabsContent>

            {/* Users Results */}
            <TabsContent value="users" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.users.map((user) => (
                  <Card key={user.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.image} />
                          <AvatarFallback>
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold truncate">{user.name}</h4>
                            {user.verified && (
                              <Badge variant="secondary" className="text-xs">Verified</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                          {user.bio && (
                            <p className="text-sm text-muted-foreground line-clamp-3 mt-1">
                              {user.bio}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{user._count.followers} followers</span>
                            <span>{user._count.posts} posts</span>
                            <span>{user._count.totalLikes} likes</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Groups Results */}
            <TabsContent value="groups" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.groups.map((group) => (
                  <GroupCard key={group.id} group={group} showJoinButton />
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Empty State */}
          {!isLoading && results.totalResults === 0 && query.trim() && (
            <Card className="text-center py-12">
              <CardContent>
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search terms or filters
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setQuery('');
                    setFilters({
                      query: '',
                      type: 'all',
                      educationalContext: {},
                      sortBy: 'relevant'
                    });
                  }}
                >
                  Clear Search
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State - No Search */}
      {!query.trim() && (
        <Card className="text-center py-12">
          <CardContent>
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Search Students Interlinked</h3>
            <p className="text-muted-foreground">
              Find posts, users, study groups, and educational content
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
