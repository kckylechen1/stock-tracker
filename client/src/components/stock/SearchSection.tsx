import { Plus, Search } from "lucide-react";

import { Input } from "@/components/ui/input";

import type { KeyboardEvent } from "react";

export interface SearchResultItem {
  code: string;
  name: string;
}

export interface SearchSectionProps {
  searchKeyword: string;
  searchResults: SearchResultItem[];
  onSearchKeywordChange: (value: string) => void;
  onSelectResult: (code: string) => void;
}

export function SearchSection({
  searchKeyword,
  searchResults,
  onSearchKeywordChange,
  onSelectResult,
}: SearchSectionProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && searchResults.length > 0) {
      onSelectResult(searchResults[0].code);
    }
  };

  return (
    <div className="p-3 border-b border-border">
      <div className="flex items-center gap-2 bg-input rounded-lg px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索股票代码/名称"
          value={searchKeyword}
          onChange={event => onSearchKeywordChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className="border-0 bg-transparent h-6 p-0 focus-visible:ring-0"
        />
      </div>

      {searchResults.length > 0 && (
        <div className="mt-2 bg-popover border border-border rounded-lg overflow-hidden">
          {searchResults.slice(0, 5).map(result => (
            <div
              key={result.code}
              className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer"
              onClick={() => onSelectResult(result.code)}
            >
              <div>
                <div className="font-medium text-sm">{result.name}</div>
                <div className="text-xs text-muted-foreground">
                  {result.code}
                </div>
              </div>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
