import { useEffect, useMemo, useState } from "react";
import { cliCommands, getAllPages } from "./content";

interface PaletteItem {
  id: string;
  title: string;
  meta: string;
  href: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

function buildItems(): PaletteItem[] {
  const pages = getAllPages().map((page) => ({
    id: page.id,
    title: page.title,
    meta: page.section,
    href: page.slug ? `/docs/${page.slug}` : "/docs",
  }));

  const commands = cliCommands.map((cmd) => ({
    id: `cmd-${cmd.id}`,
    title: cmd.name,
    meta: cmd.summary,
    href: `/docs/commands/${cmd.id}`,
  }));

  return [...pages, ...commands];
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const items = useMemo(() => buildItems(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return items.slice(0, 12);
    }
    return items
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) || item.meta.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [items, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        return;
      }

      if (event.key === "Enter" && filtered[activeIndex]) {
        event.preventDefault();
        window.location.href = filtered[activeIndex].href;
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, filtered, activeIndex, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="docs-palette-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="docs-palette"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="Search documentation"
      >
        <input
          className="docs-palette-input"
          autoFocus
          placeholder="Search commands and docs…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="docs-palette-results">
          {filtered.length === 0 ? (
            <div className="docs-palette-empty">No results</div>
          ) : (
            filtered.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`docs-palette-item${index === activeIndex ? " active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  window.location.href = item.href;
                  onClose();
                }}
              >
                <div className="docs-palette-item-title">{item.title}</div>
                <div className="docs-palette-item-meta">{item.meta}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return {
    open,
    openPalette: () => setOpen(true),
    closePalette: () => setOpen(false),
  };
}
