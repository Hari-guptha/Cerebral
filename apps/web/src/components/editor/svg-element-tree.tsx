"use client";

import { buildTransformString, getChildren } from "@svg-animator/engine";
import type { ElementNode, Project } from "@svg-animator/types";
import type { AppliedState } from "@svg-animator/types";
import { useEditorStore, type SelectionMode } from "@/store/editor-store";
import { cn, toReactSvgAttrs } from "@/lib/utils";
import { memo } from "react";
import { VideoElement } from "@/components/editor/video-element";

export interface SvgElementTreeProps {
  element: ElementNode;
  onElementMouseDown?: (e: React.MouseEvent, elementId: string) => void;
  interactive?: boolean;
  showSelection?: boolean;
  /** Ctrl+hover deep-select preview */
  deepSelectHoverId?: string | null;
  /** Override store state for isolated previews */
  projectOverride?: Project;
  appliedStateOverride?: AppliedState;
  selectedIdsOverride?: string[];
  selectElementOverride?: (id: string, mode?: SelectionMode) => void;
}

function subtreeStateRefUnchanged(
  elementId: string,
  elements: ElementNode[],
  prev: AppliedState,
  next: AppliedState
): boolean {
  if (prev[elementId] !== next[elementId]) return false;
  for (const child of getChildren(elements, elementId)) {
    if (!subtreeStateRefUnchanged(child.id, elements, prev, next)) return false;
  }
  return true;
}

const SvgElementTreeInner = memo(function SvgElementTreeInner({
  element,
  onElementMouseDown,
  interactive = true,
  showSelection = true,
  deepSelectHoverId = null,
  project,
  appliedState,
  selectedIds,
  selectElement,
  currentTime,
  isPlaying,
}: SvgElementTreeProps & {
  project: Project;
  appliedState: AppliedState;
  selectedIds: string[];
  selectElement: (id: string, mode?: SelectionMode) => void;
  currentTime: number;
  isPlaying: boolean;
}) {
  if (!element.visible) return null;

  const state = appliedState[element.id];
  const transform = state?.transform ?? element.transform;
  const transformStr = buildTransformString(transform);
  const opacity = state?.opacity ?? (element.attrs.opacity as number) ?? 1;
  const fill = state?.fill ?? (element.attrs.fill as string);
  const stroke = state?.stroke ?? (element.attrs.stroke as string);
  const strokeWidth = state?.strokeWidth ?? (element.attrs["stroke-width"] as number);
  const pathD = state?.pathD ?? (element.attrs.d as string);
  const isSelected = showSelection && selectedIds.includes(element.id);
  const isDeepHover = deepSelectHoverId === element.id && !isSelected;

  const children = getChildren(project.elements, element.id).map((c) => (
    <SvgElementTreeInner
      key={c.id}
      element={c}
      onElementMouseDown={onElementMouseDown}
      interactive={interactive}
      showSelection={showSelection}
      deepSelectHoverId={deepSelectHoverId}
      project={project}
      appliedState={appliedState}
      selectedIds={selectedIds}
      selectElement={selectElement}
      currentTime={currentTime}
      isPlaying={isPlaying}
    />
  ));

  const handleClick = interactive
    ? (e: React.MouseEvent) => {
        e.stopPropagation();
        if (e.ctrlKey || e.metaKey) return;
        const mode: SelectionMode = e.shiftKey ? "add" : "replace";
        if (mode !== "replace") {
          selectElement(element.id, mode);
        }
      }
    : undefined;

  const commonProps = {
    opacity,
    fill: fill || undefined,
    stroke: stroke || undefined,
    strokeWidth: strokeWidth || undefined,
    transform: transformStr !== "none" ? transformStr : undefined,
    "data-element-id": element.id,
    onMouseDown: interactive && onElementMouseDown
      ? (e: React.MouseEvent) => onElementMouseDown(e, element.id)
      : undefined,
    onClick: handleClick,
    style: interactive
      ? ({ cursor: element.locked ? "not-allowed" : "move" } as React.CSSProperties)
      : undefined,
  };

  if (element.type === "group") {
    return (
      <g {...commonProps}>
        {(isSelected || isDeepHover) && (
          <rect
            x={-2}
            y={-2}
            width={project.canvas.width + 4}
            height={project.canvas.height + 4}
            fill="none"
            stroke={isDeepHover ? "#38bdf8" : "white"}
            strokeWidth={1}
            strokeDasharray="4 2"
            pointerEvents="none"
            opacity={isDeepHover ? 0.85 : 0.4}
          />
        )}
        {children}
      </g>
    );
  }

  const rawAttrs: Record<string, unknown> = { ...element.attrs };
  delete rawAttrs.fill;
  delete rawAttrs.stroke;
  delete rawAttrs["stroke-width"];
  delete rawAttrs.d;
  delete rawAttrs.opacity;
  delete rawAttrs.text;

  const attrs = toReactSvgAttrs(rawAttrs);
  const Tag = element.type as keyof React.JSX.IntrinsicElements;

  if (element.type === "text") {
    const text = String(element.attrs.text ?? element.name);
    return (
      <text {...commonProps} {...attrs}>
        {text}
      </text>
    );
  }
  if (element.type === "image") {
    const href = String(element.attrs.href ?? "");
    const objectFit = String(element.attrs.objectFit ?? "contain");
    const preserveAspectRatio =
      objectFit === "contain"
        ? "xMidYMid meet"
        : objectFit === "cover"
          ? "xMidYMid slice"
          : objectFit === "fill"
            ? "none"
            : "xMidYMid meet";

    return (
      <image
        {...commonProps}
        href={href}
        x={Number(element.attrs.x ?? 0)}
        y={Number(element.attrs.y ?? 0)}
        width={Number(element.attrs.width ?? 100)}
        height={Number(element.attrs.height ?? 100)}
        preserveAspectRatio={preserveAspectRatio}
        className={cn(
          isSelected && "outline outline-1 outline-white outline-offset-2",
          isDeepHover && "outline outline-1 outline-sky-400 outline-offset-2"
        )}
      />
    );
  }
  if (element.type === "video") {
    return (
      <VideoElement
        element={element}
        opacity={opacity}
        transform={transformStr !== "none" ? transformStr : undefined}
        currentTime={currentTime}
        isPlaying={isPlaying}
        isSelected={isSelected}
        isDeepHover={isDeepHover}
        interactive={interactive}
        onMouseDown={
          interactive && onElementMouseDown
            ? (e) => onElementMouseDown(e, element.id)
            : undefined
        }
        onClick={handleClick}
      />
    );
  }
  if (element.type === "path") {
    return (
      <path
        {...commonProps}
        {...attrs}
        d={pathD}
        className={cn(
          isSelected && "drop-shadow-[0_0_0_1px_white]",
          isDeepHover && "drop-shadow-[0_0_0_1px_#38bdf8]"
        )}
      />
    );
  }

  return (
    <Tag
      {...commonProps}
      {...attrs}
      className={cn(
        isSelected && "outline outline-1 outline-white outline-offset-2",
        isDeepHover && "outline outline-1 outline-sky-400 outline-offset-2"
      )}
    />
  );
}, (prev, next) => {
  if (prev.element.id !== next.element.id) return false;
  if (prev.project !== next.project) return false;
  if (prev.interactive !== next.interactive) return false;
  if (prev.showSelection !== next.showSelection) return false;
  if (prev.deepSelectHoverId !== next.deepSelectHoverId) return false;
  if (prev.onElementMouseDown !== next.onElementMouseDown) return false;
  if (prev.selectedIds !== next.selectedIds) {
    const wasSelected = prev.selectedIds.includes(prev.element.id);
    const isSelected = next.selectedIds.includes(next.element.id);
    if (wasSelected !== isSelected) return false;
  }
  return subtreeStateRefUnchanged(
    prev.element.id,
    prev.project.elements,
    prev.appliedState,
    next.appliedState
  );
});

function SvgElementTreeFromStore(props: SvgElementTreeProps) {
  const project = useEditorStore((s) => s.project);
  const appliedState = useEditorStore((s) => s.appliedState);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const selectElement = useEditorStore((s) => s.selectElement);
  const currentTime = useEditorStore((s) => s.currentTime);
  const isPlaying = useEditorStore((s) => s.isPlaying);

  if (!project) return null;

  return (
    <SvgElementTreeInner
      {...props}
      project={project}
      appliedState={appliedState}
      selectedIds={selectedIds}
      selectElement={selectElement}
      currentTime={currentTime}
      isPlaying={isPlaying}
    />
  );
}

export function SvgElementTree(props: SvgElementTreeProps) {
  const hasOverrides =
    props.projectOverride !== undefined &&
    props.appliedStateOverride !== undefined;

  if (hasOverrides) {
    if (!props.projectOverride) return null;
    return (
      <SvgElementTreeInner
        {...props}
        project={props.projectOverride}
        appliedState={props.appliedStateOverride!}
        selectedIds={props.selectedIdsOverride ?? []}
        selectElement={props.selectElementOverride ?? (() => {})}
        currentTime={0}
        isPlaying={false}
      />
    );
  }

  return <SvgElementTreeFromStore {...props} />;
}
