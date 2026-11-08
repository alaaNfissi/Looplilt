"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconButton } from "@looplilt-studio/ui";

/**
 * The keyboard shortcut reference.
 *
 * Every shortcut the editor binds is listed here, grouped the way someone
 * actually works rather than by key. An editor lives or dies on its shortcuts,
 * and one that never tells you they exist is an editor most people drive with
 * the mouse forever — so this is reachable from the toolbar and from `?`.
 *
 * The list is written out rather than derived from the key handler: the handler
 * is a switch over raw key names, and the useful description ("step one frame,
 * hold Shift for ten") is not recoverable from it.
 */
interface Shortcut {
  keys: string[];
  description: string;
}

const GROUPS: { title: string; shortcuts: Shortcut[] }[] = [
  {
    title: "Playback",
    shortcuts: [
      { keys: ["Space"], description: "Play or pause" },
      { keys: ["←", "→"], description: "Step one frame (hold Shift for ten)" },
      { keys: ["Home", "End"], description: "Jump to the start or end" },
    ],
  },
  {
    title: "Editing",
    shortcuts: [
      { keys: ["S"], description: "Split the clip at the playhead" },
      { keys: ["Delete"], description: "Delete the selection" },
      { keys: ["Esc"], description: "Clear the selection" },
      { keys: ["mod", "Z"], description: "Undo" },
      { keys: ["mod", "Shift", "Z"], description: "Redo" },
    ],
  },
  {
    title: "Timeline",
    shortcuts: [
      { keys: ["I"], description: "Set the in point for export" },
      { keys: ["O"], description: "Set the out point for export" },
      { keys: ["N"], description: "Toggle snapping" },
      { keys: ["+", "−"], description: "Zoom in or out" },
    ],
  },
  {
    title: "Project",
    shortcuts: [
      { keys: ["mod", "S"], description: "Save now" },
      { keys: ["?"], description: "Show this list" },
    ],
  },
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  // Mac writes ⌘, everything else writes Ctrl. Read once on open rather than at
  // module load so it can never run during server rendering.
  const [modKey] = useState(() =>
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl",
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="border-border-default bg-surface-panel max-h-full w-[420px] max-w-full overflow-y-auto rounded-md border p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-text-primary text-sm font-semibold">Keyboard shortcuts</h2>
          <IconButton size="sm" label="Close" onClick={onClose}>
            <X size={14} />
          </IconButton>
        </div>

        <div className="flex flex-col gap-3">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="text-2xs text-text-tertiary mb-1 font-medium tracking-wide uppercase">
                {group.title}
              </h3>
              <ul className="flex flex-col">
                {group.shortcuts.map((shortcut) => (
                  <li
                    key={shortcut.description}
                    className="flex items-center justify-between gap-3 py-1"
                  >
                    <span className="text-text-secondary text-xs">{shortcut.description}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {shortcut.keys.map((key) => (
                        <kbd
                          key={key}
                          className="border-border-default bg-surface-raised text-text-primary text-2xs min-w-[1.5rem] rounded-xs border px-1.5 py-0.5 text-center font-medium"
                        >
                          {key === "mod" ? modKey : key}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
