// src/components/features/search/SearchBar.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SearchIcon, XIcon, HistoryIcon, SaveIcon, FilterIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchBarProps {
  onFiltersClick?: () => void;
  className?: string;
}

export function SearchBar({ onFiltersClick, className }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 2) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    loadRecentSearches();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(debouncedQuery)}`);
      const data = await response.json();
      if (data.success) {
        setSuggestions(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentSearches = () => {
    const searches = localStorage.getItem('recentSearches');
    if (searches) {
      setRecentSearches(JSON.parse(searches).slice(0, 5));
    }
  };

  const saveRecentSearch = (searchQuery: string) => {
    const searches = localStorage.getItem('recentSearches');
    let recent = searches ? JSON.parse(searches) : [];
    recent = [searchQuery, ...recent.filter((s: string) => s !== searchQuery)];
    recent = recent.slice(0, 10);
    localStorage.setItem('recentSearches', JSON.stringify(recent));
    setRecentSearches(recent);
  };

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    saveRecentSearch(searchQuery);
    setShowSuggestions(false);
    
    const params = new URLSearchParams(searchParams);
    params.set('q', searchQuery);
    router.push(`/dashboard/search?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
  };

  const clearSearch = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search projects, tasks, or team members..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          className="pl-9 pr-20"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {query && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={clearSearch}
            >
              <XIcon className="h-3 w-3" />
            </Button>
          )}
          {onFiltersClick && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onFiltersClick}
            >
              <FilterIcon className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (suggestions.length > 0 || recentSearches.length > 0) && (
        <Card
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 z-50 overflow-hidden"
        >
          <div className="max-h-96 overflow-y-auto">
            {suggestions.length > 0 && (
              <div className="p-2">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">Suggestions</p>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
                    onClick={() => handleSearch(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            
            {recentSearches.length > 0 && suggestions.length === 0 && (
              <div className="p-2">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">Recent Searches</p>
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2"
                    onClick={() => handleSearch(search)}
                  >
                    <HistoryIcon className="h-3 w-3 text-muted-foreground" />
                    {search}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}