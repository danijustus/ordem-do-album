"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type Item = {
  id: string;
  url: string;
  nome: string;
};

function Card({
  item,
  posicao,
  onRemover,
  arrastavel,
}: {
  item: Item;
  posicao: number;
  onRemover?: (id: string) => void;
  arrastavel: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !arrastavel });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(arrastavel ? { ...attributes, ...listeners } : {})}
      className={`relative rounded-lg overflow-hidden border border-neutral-200 bg-white shadow-sm touch-none select-none ${
        arrastavel ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      <span className="absolute top-1 left-1 z-10 rounded bg-rosa px-1.5 py-0.5 text-xs font-semibold text-white">
        {posicao}
      </span>
      {onRemover && (
        <button
          type="button"
          // Evita que o clique de remover inicie um arraste.
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onRemover(item.id)}
          className="absolute top-1 right-1 z-10 rounded-md bg-red-600/90 px-1.5 py-0.5 text-xs font-semibold text-white hover:bg-red-700"
          aria-label="Remover foto"
        >
          ✕
        </button>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.url}
        alt={item.nome}
        loading="lazy"
        decoding="async"
        // Se a miniatura não existir (foto antiga), cai no arquivo original.
        onError={(e) => {
          const img = e.currentTarget;
          if (img.src.endsWith(".thumb.jpg")) {
            img.src = img.src.slice(0, -".thumb.jpg".length);
          }
        }}
        className="pointer-events-none aspect-square w-full object-cover"
        draggable={false}
      />
    </div>
  );
}

export default function SortableGrid({
  itens,
  onReordenar,
  onRemover,
}: {
  itens: Item[];
  onReordenar?: (novaOrdem: Item[]) => void;
  onRemover?: (id: string) => void;
}) {
  const [ativo, setAtivo] = useState<Item | null>(null);
  const arrastavel = !!onReordenar;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    setAtivo(itens.find((i) => i.id === event.active.id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setAtivo(null);
    const { active, over } = event;
    if (!over || active.id === over.id || !onReordenar) return;
    const oldIndex = itens.findIndex((i) => i.id === active.id);
    const newIndex = itens.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReordenar(arrayMove(itens, oldIndex, newIndex));
  }

  const grid =
    "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setAtivo(null)}
    >
      <SortableContext
        items={itens.map((i) => i.id)}
        strategy={rectSortingStrategy}
      >
        <div className={grid}>
          {itens.map((item, i) => (
            <Card
              key={item.id}
              item={item}
              posicao={i + 1}
              onRemover={onRemover}
              arrastavel={arrastavel}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {ativo ? (
          <div className="relative rounded-lg overflow-hidden border border-neutral-300 bg-white shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ativo.url}
              alt={ativo.nome}
              className="aspect-square w-full object-cover"
              draggable={false}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
