"use client";

import { useEffect, useRef, useState } from "react";
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

// A miniatura é o arquivo original + ".thumb.jpg" (ver lib/storage.ts).
// Para ampliar, voltamos para o arquivo original em resolução cheia.
function urlOriginal(urlThumb: string): string {
  return urlThumb.endsWith(".thumb.jpg")
    ? urlThumb.slice(0, -".thumb.jpg".length)
    : urlThumb;
}

function Card({
  item,
  posicao,
  onRemover,
  arrastavel,
  selecionado,
  onClicar,
}: {
  item: Item;
  posicao: number;
  onRemover?: (id: string) => void;
  arrastavel: boolean;
  selecionado: boolean;
  onClicar: (item: Item, e: React.MouseEvent) => void;
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
      onClick={(e) => onClicar(item, e)}
      className={`relative rounded-lg overflow-hidden border bg-white shadow-sm touch-none select-none ${
        arrastavel ? "cursor-grab active:cursor-grabbing" : ""
      } ${selecionado ? "border-rosa ring-2 ring-rosa" : "border-neutral-200"}`}
    >
      <span className="absolute top-1 left-1 z-10 rounded bg-rosa px-1.5 py-0.5 text-xs font-semibold text-white">
        {posicao}
      </span>
      {onRemover && (
        <button
          type="button"
          // Evita que o clique de remover inicie um arraste ou amplie a foto.
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemover(item.id);
          }}
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
  const [grupoArrasto, setGrupoArrasto] = useState<Item[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [ancoraSelecao, setAncoraSelecao] = useState<string | null>(null);
  const [ampliada, setAmpliada] = useState<Item | null>(null);
  // Sinaliza se o gesto atual foi um arraste, para o clique que o navegador
  // dispara logo em seguida não abrir a foto ampliada sem querer.
  const houveArrastoRef = useRef(false);
  const arrastavel = !!onReordenar;

  // Mantém a seleção coerente se alguma foto selecionada for removida.
  useEffect(() => {
    setSelecionados((prev) => {
      const idsAtuais = new Set(itens.map((i) => i.id));
      const filtrado = new Set([...prev].filter((id) => idsAtuais.has(id)));
      return filtrado.size === prev.size ? prev : filtrado;
    });
  }, [itens]);

  useEffect(() => {
    if (!ampliada) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setAmpliada(null);
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [ampliada]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Shift+clique seleciona um intervalo (da última âncora até a foto
  // clicada), como no Explorer/Finder. Clicar de novo na única selecionada
  // desmarca. Sem Shift, o clique apenas amplia a foto.
  function selecionarComShift(id: string) {
    if (ancoraSelecao === id && selecionados.size === 1) {
      setSelecionados(new Set());
      setAncoraSelecao(null);
      return;
    }
    if (ancoraSelecao == null) {
      setSelecionados(new Set([id]));
      setAncoraSelecao(id);
      return;
    }
    const idxAncora = itens.findIndex((i) => i.id === ancoraSelecao);
    const idxAtual = itens.findIndex((i) => i.id === id);
    if (idxAncora < 0 || idxAtual < 0) {
      setSelecionados(new Set([id]));
      setAncoraSelecao(id);
      return;
    }
    const [ini, fim] =
      idxAncora <= idxAtual ? [idxAncora, idxAtual] : [idxAtual, idxAncora];
    setSelecionados(new Set(itens.slice(ini, fim + 1).map((i) => i.id)));
    setAncoraSelecao(id);
  }

  function aoClicarFoto(item: Item, e: React.MouseEvent) {
    if (houveArrastoRef.current) return;
    if (arrastavel && e.shiftKey) {
      selecionarComShift(item.id);
      return;
    }
    setAmpliada(item);
  }

  function handleDragStart(event: DragStartEvent) {
    houveArrastoRef.current = true;
    const item = itens.find((i) => i.id === event.active.id) ?? null;
    setAtivo(item);
    if (item && selecionados.has(item.id) && selecionados.size > 1) {
      setGrupoArrasto(itens.filter((i) => selecionados.has(i.id)));
    } else {
      setGrupoArrasto(item ? [item] : []);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setAtivo(null);
    setTimeout(() => {
      houveArrastoRef.current = false;
    }, 0);

    const { active, over } = event;
    if (!over || !onReordenar) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Se a foto arrastada faz parte da seleção múltipla, move o grupo
    // inteiro junto, mantendo a ordem relativa entre elas.
    const grupo =
      selecionados.has(activeId) && selecionados.size > 1
        ? itens.filter((i) => selecionados.has(i.id))
        : itens.filter((i) => i.id === activeId);
    if (grupo.length === 0) return;

    const idsGrupo = new Set(grupo.map((i) => i.id));
    if (idsGrupo.has(overId)) return;

    const resto = itens.filter((i) => !idsGrupo.has(i.id));
    const indiceAlvo = resto.findIndex((i) => i.id === overId);
    if (indiceAlvo < 0) return;

    onReordenar([
      ...resto.slice(0, indiceAlvo),
      ...grupo,
      ...resto.slice(indiceAlvo),
    ]);
    setSelecionados(new Set());
    setAncoraSelecao(null);
  }

  function handleDragCancel() {
    setAtivo(null);
    setTimeout(() => {
      houveArrastoRef.current = false;
    }, 0);
  }

  const grid =
    "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

  return (
    <div>
      {arrastavel && selecionados.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-rosa/40 bg-rosa/10 px-3 py-2 text-sm">
          <span className="font-medium text-rosa-escuro">
            {selecionados.size} foto{selecionados.size > 1 ? "s" : ""}{" "}
            selecionada{selecionados.size > 1 ? "s" : ""}
          </span>
          <span className="text-neutral-500">
            Arraste uma delas para mover todas juntas.
          </span>
          <button
            type="button"
            onClick={() => {
              setSelecionados(new Set());
              setAncoraSelecao(null);
            }}
            className="ml-auto rounded border border-border bg-white px-2 py-1 text-xs hover:bg-muted"
          >
            Cancelar seleção
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
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
                selecionado={selecionados.has(item.id)}
                onClicar={aoClicarFoto}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {ativo ? (
            <div className="relative rounded-lg overflow-hidden border border-neutral-300 bg-white shadow-xl">
              {grupoArrasto.length > 1 && (
                <span className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-rosa text-xs font-bold text-white shadow">
                  {grupoArrasto.length}
                </span>
              )}
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

      {ampliada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setAmpliada(null)}
        >
          <button
            type="button"
            onClick={() => setAmpliada(null)}
            aria-label="Fechar"
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlOriginal(ampliada.url)}
            alt={ampliada.nome}
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== ampliada.url) img.src = ampliada.url;
            }}
            className="max-h-[90vh] max-w-full rounded object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
