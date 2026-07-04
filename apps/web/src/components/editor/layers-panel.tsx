"use client";

import { getChildren } from "@svg-animator/engine";
import type { ElementNode } from "@svg-animator/types";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FileImage,
  FileVideo,
  Folder,
  Lock,
  Pencil,
  Scissors,
  Trash2,
  Unlock,
  ArrowUp,
  ArrowDown,
  Layers,
  Upload,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditorStore, type SelectionMode } from "@/store/editor-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ImportMediaDialog } from "@/components/editor/import-media-dialog";

interface LayerContextMenuState {
  x: number;
  y: number;
  elementId: string;
}

function LayerContextMenu({
  menu,
  onClose,
}: {
  menu: LayerContextMenuState;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("mousedown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [onClose]);

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let { x, y } = menu;
    if (rect.right > window.innerWidth - pad) x -= rect.right - window.innerWidth + pad;
    if (rect.bottom > window.innerHeight - pad) y -= rect.bottom - window.innerHeight + pad;
    if (x !== menu.x || y !== menu.y) {
      el.style.left = `${Math.max(pad, x)}px`;
      el.style.top = `${Math.max(pad, y)}px`;
    }
  }, [menu]);

  const run = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] min-w-[148px] rounded-md border border-neutral-700 bg-neutral-900 py-1 shadow-xl"
      style={{ left: menu.x, top: menu.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-neutral-200 hover:bg-neutral-800"
        onClick={() =>
          run(() => {
            useEditorStore.getState().selectElement(menu.elementId, "replace");
            useEditorStore.getState().setRenamingLayerId(menu.elementId);
          })
        }
      >
        <Pencil className="h-3.5 w-3.5 text-neutral-500" />
        Rename
        <span className="ml-auto text-[10px] text-neutral-600">Ctrl+R</span>
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-neutral-200 hover:bg-neutral-800"
        onClick={() =>
          run(() => {
            useEditorStore.getState().selectElement(menu.elementId, "replace");
            useEditorStore.getState().duplicateSelected();
          })
        }
      >
        <Copy className="h-3.5 w-3.5 text-neutral-500" />
        Duplicate
        <span className="ml-auto text-[10px] text-neutral-600">Ctrl+D</span>
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-neutral-200 hover:bg-neutral-800"
        onClick={() =>
          run(() => {
            useEditorStore.getState().selectElement(menu.elementId, "replace");
            useEditorStore.getState().copySelected();
          })
        }
      >
        <Copy className="h-3.5 w-3.5 text-neutral-500" />
        Copy
        <span className="ml-auto text-[10px] text-neutral-600">Ctrl+C</span>
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-neutral-200 hover:bg-neutral-800"
        onClick={() =>
          run(() => {
            useEditorStore.getState().selectElement(menu.elementId, "replace");
            useEditorStore.getState().cutSelected();
          })
        }
      >
        <Scissors className="h-3.5 w-3.5 text-neutral-500" />
        Cut
        <span className="ml-auto text-[10px] text-neutral-600">Ctrl+X</span>
      </button>
      <div className="my-1 border-t border-neutral-800" />
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-400 hover:bg-red-950/40"
        onClick={() =>
          run(() => {
            useEditorStore.getState().selectElement(menu.elementId, "replace");
            useEditorStore.getState().deleteSelected();
          })
        }
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
        <span className="ml-auto text-[10px] text-red-400/60">Del</span>
      </button>
    </div>
  );
}

const LayerItem = memo(function LayerItem({
  element,
  depth,
  elements,
  isSelected,
  isRenaming,
  onContextMenu,
}: {
  element: ElementNode;
  depth: number;
  elements: ElementNode[];
  isSelected: boolean;
  isRenaming: boolean;
  onContextMenu: (e: React.MouseEvent, elementId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [draftName, setDraftName] = useState(element.name);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const children = useMemo(
    () => getChildren(elements, element.id),
    [elements, element.id]
  );
  const hasChildren = children.length > 0;

  useEffect(() => {
    if (!isRenaming) setDraftName(element.name);
  }, [element.name, isRenaming]);

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  const commitRename = useCallback(() => {
    useEditorStore.getState().finishRenameElement(element.id, draftName);
  }, [element.id, draftName]);

  const cancelRename = useCallback(() => {
    setDraftName(element.name);
    useEditorStore.getState().setRenamingLayerId(null);
  }, [element.name]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const mode: SelectionMode =
        e.shiftKey && !e.ctrlKey && !e.metaKey
          ? "range"
          : e.ctrlKey || e.metaKey
            ? "toggle"
            : "replace";
      useEditorStore.getState().selectElement(element.id, mode);
    },
    [element.id]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      useEditorStore.getState().selectElement(element.id, "replace");
      useEditorStore.getState().setRenamingLayerId(element.id);
    },
    [element.id]
  );

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-sm px-1.5 py-1 text-xs select-none hover:bg-neutral-900",
          isSelected && "bg-white text-black"
        )}
        style={{ paddingLeft: depth * 14 + 6 }}
        onMouseDown={(e) => {
          if (!isRenaming && e.button === 0) e.preventDefault();
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => onContextMenu(e, element.id)}
      >
        {hasChildren ? (
          <button
            type="button"
            className="p-0.5 opacity-60 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        {element.type === "group" ? (
          <Folder className={cn("h-3 w-3", isSelected ? "text-black" : "text-neutral-500")} />
        ) : element.type === "image" ? (
          <FileImage className={cn("h-3 w-3", isSelected ? "text-black" : "text-neutral-500")} />
        ) : element.type === "video" ? (
          <FileVideo className={cn("h-3 w-3", isSelected ? "text-black" : "text-neutral-500")} />
        ) : (
          <span className={cn("h-2 w-2 rounded-full", isSelected ? "bg-black" : "bg-neutral-600")} />
        )}
        {isRenaming ? (
          <input
            ref={renameInputRef}
            className="min-w-0 flex-1 rounded-sm bg-white/90 px-1 text-xs text-black outline-none ring-1 ring-black/20"
            value={draftName}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              setDraftName(e.target.value);
              useEditorStore.getState().renameElement(element.id, e.target.value);
            }}
            onBlur={commitRename}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                e.preventDefault();
                commitRename();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelRename();
              }
            }}
          />
        ) : (
          <span
            className={cn(
              "min-w-0 flex-1 truncate select-none",
              isSelected ? "text-black" : "text-neutral-300"
            )}
            title={element.name}
          >
            {element.name}
          </span>
        )}
        <div className={cn("hidden gap-0.5 group-hover:flex", isSelected && "flex")}>
          <button
            type="button"
            className="rounded p-0.5 hover:bg-black/10"
            onClick={(e) => {
              e.stopPropagation();
              useEditorStore.getState().reorderElement(element.id, "up");
            }}
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="rounded p-0.5 hover:bg-black/10"
            onClick={(e) => {
              e.stopPropagation();
              useEditorStore.getState().reorderElement(element.id, "down");
            }}
          >
            <ArrowDown className="h-3 w-3" />
          </button>
        </div>
        <button
          type="button"
          className="p-0.5 opacity-50 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            useEditorStore.getState().toggleElementLock(element.id);
          }}
        >
          {element.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
        </button>
        <button
          type="button"
          className="p-0.5 opacity-50 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            useEditorStore.getState().toggleElementVisibility(element.id);
          }}
        >
          {element.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </button>
      </div>
      {expanded &&
        children.map((child) => (
          <LayerItemConnector
            key={child.id}
            element={child}
            depth={depth + 1}
            elements={elements}
            onContextMenu={onContextMenu}
          />
        ))}
    </div>
  );
});

function LayerItemConnector({
  element,
  depth,
  elements,
  onContextMenu,
}: {
  element: ElementNode;
  depth: number;
  elements: ElementNode[];
  onContextMenu: (e: React.MouseEvent, elementId: string) => void;
}) {
  const isSelected = useEditorStore((s) => s.selectedIds.includes(element.id));
  const isRenaming = useEditorStore((s) => s.renamingLayerId === element.id);

  return (
    <LayerItem
      element={element}
      depth={depth}
      elements={elements}
      isSelected={isSelected}
      isRenaming={isRenaming}
      onContextMenu={onContextMenu}
    />
  );
}

export function LayersPanel() {
  const elements = useEditorStore((s) => s.project?.elements);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const groupSelected = useEditorStore((s) => s.groupSelected);
  const ungroupSelected = useEditorStore((s) => s.ungroupSelected);

  const [contextMenu, setContextMenu] = useState<LayerContextMenuState | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const handleContextMenu = useCallback((e: React.MouseEvent, elementId: string) => {
    e.preventDefault();
    e.stopPropagation();
    useEditorStore.getState().selectElement(elementId, "replace");
    setContextMenu({ x: e.clientX, y: e.clientY, elementId });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  if (!elements) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-xs text-neutral-600">
        Import an SVG to see layers
      </div>
    );
  }

  const roots = getChildren(elements, null);

  return (
    <div className="flex h-full flex-col bg-black">
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-neutral-500" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
            Layers
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setImportOpen(true)}
            title="Import media layer"
          >
            <Upload className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={groupSelected}
            disabled={selectedIds.length < 2}
            title="Ctrl+G"
          >
            Group
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={ungroupSelected}
            disabled={selectedIds.length !== 1}
            title="Ctrl+Shift+G"
          >
            Ungroup
          </Button>
        </div>
      </div>
      {selectedIds.length > 1 && (
        <div className="border-b border-neutral-800 bg-neutral-950 px-3 py-1.5 text-[10px] text-neutral-500">
          {selectedIds.length} selected · Right-click for menu · Ctrl+R rename
        </div>
      )}
      <div className="flex-1 overflow-auto p-1.5 select-none">
        {roots.map((el) => (
          <LayerItemConnector
            key={el.id}
            element={el}
            depth={0}
            elements={elements}
            onContextMenu={handleContextMenu}
          />
        ))}
      </div>
      {contextMenu && <LayerContextMenu menu={contextMenu} onClose={closeContextMenu} />}
      <ImportMediaDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
