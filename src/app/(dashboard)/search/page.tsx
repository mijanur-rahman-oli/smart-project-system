// src/app/(dashboard)/search/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchIcon, FilterIcon, XIcon, ClockIcon, BookmarkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { searchAction, getSearchSuggestions, saveSearchAction, getSavedSearchesAction } from '@/server/actions/search.actions';

interface SearchResult {
  id: string;
  type: 'project' | 'task' | 'user';
  title: string;
  description: string;
  url: string;
  metadata: Record<string, any>;
  score: number;
  createdAt: Date;
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (query.length >= 2) {
      performSearch();
      fetchSuggestions();
    }
  }, [query, activeTab]);

  useEffect(() => {
    fetchSavedSearches();
  }, []);

  const performSearch = async () => {
    setLoading(true);
    try {
      const result = await searchAction({
        query,
        type: activeTab !== 'all' ? activeTab : undefined,
      });
      if (result.success) {
        setResults(result.data);
        setTotal(result.pagination.total);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to perform search');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    if (query.length < 2) return;
    try {
      const result = await getSearchSuggestions(query);
      if (result.success) {
        setSuggestions(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions');
    }
  };

  const fetchSavedSearches = async () => {
    try {
      const result = await getSavedSearchesAction();
      if (result.success) {
        setSavedSearches(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch saved searches');
    }
  };

  const handleSaveSearch = async () => {
    if (!query) return;
    const name = prompt('Enter a name for this search:', query);
    if (name) {
      try {
        const result = await saveSearchAction(name, query);
        if (result.success) {
          toast.success('Search saved');
          fetchSavedSearches();
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        toast.error('Failed to save search');
      }
    }
  };

  const handleUseSavedSearch = (savedQuery: string) => {
    setQuery(savedQuery);
    router.push(`/dashboard/search?q=${encodeURIComponent(savedQuery)}`);
  };

  const filteredResults = results.filter(result => {
    if (activeTab === 'all') return true;
    return result.type === activeTab;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project': return '📁';
      case 'task': return '✅';
      case 'user': return '👤';
      default: return '🔍';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'project': return 'bg-blue-500/10 text-blue-500';
      case 'task': return 'bg-green-500/10 text-green-500';
      case 'user': return 'bg-purple-500/10 text-purple-500';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <p className="text-muted-foreground mt-1">
          Find projects, tasks, and team members
        </p>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Search for projects, tasks, or team members..."
            className="pl-9 pr-24"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setQuery('')}
              >
                <XIcon className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={handleSaveSearch}
              disabled={!query}
            >
              <BookmarkIcon className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Suggestions Dropdown */}
          {showSuggestions && (suggestions.length > 0 || savedSearches.length > 0) && (
            <Card className="absolute top-full left-0 right-0 mt-2 z-50">
              <CardContent className="p-2">
                {suggestions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground px-2 py-1">Suggestions</p>
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
                        onClick={() => setQuery(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                
                {savedSearches.length > 0 && suggestions.length === 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground px-2 py-1">Saved Searches</p>
                    {savedSearches.map((search) => (
                      <button
                        key={search.id}
                        className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2"
                        onClick={() => handleUseSavedSearch(search.query)}
                      >
                        <ClockIcon className="h-3 w-3 text-muted-foreground" />
                        {search.name}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </Card>

      {/* Results */}
      {query.length >= 2 && (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">
                All ({total})
              </TabsTrigger>
              <TabsTrigger value="project">
                Projects ({results.filter(r => r.type === 'project').length})
              </TabsTrigger>
              <TabsTrigger value="task">
                Tasks ({results.filter(r => r.type === 'task').length})
              </TabsTrigger>
              <TabsTrigger value="user">
                Users ({results.filter(r => r.type === 'user').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {loading ? (
                <SearchResultsSkeleton />
              ) : filteredResults.length === 0 ? (
                <Card className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <SearchIcon className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <h3 className="text-lg font-semibold">No results found</h3>
                      <p className="text-muted-foreground">
                        Try different keywords or check your spelling
                      </p>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredResults.map((result) => (
                    <Card
                      key={`${result.type}-${result.id}`}
                      className="cursor-pointer hover:shadow-lg transition-all"
                      onClick={() => router.push(result.url)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">{getTypeIcon(result.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg">{result.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {result.description}
                                </p>
                              </div>
                              <Badge className={getTypeColor(result.type)}>
                                {result.type}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                              {result.type === 'task' && result.metadata.priority && (
                                <Badge variant="outline" className={
                                  result.metadata.priority === 'high' ? 'text-red-500' :
                                  result.metadata.priority === 'medium' ? 'text-yellow-500' :
                                  'text-green-500'
                                }>
                                  {result.metadata.priority}
                                </Badge>
                              )}
                              {result.type === 'task' && result.metadata.projectName && (
                                <span>📁 {result.metadata.projectName}</span>
                              )}
                              {result.type === 'user' && result.metadata.role && (
                                <span>👔 {result.metadata.role}</span>
                              )}
                              <span>🕒 Updated {format(new Date(result.createdAt), 'MMM dd, yyyy')}</span>
                              <span>🎯 {Math.round(result.score)}% match</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchResultsSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-96 mt-2" />
                <div className="flex gap-4 mt-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}