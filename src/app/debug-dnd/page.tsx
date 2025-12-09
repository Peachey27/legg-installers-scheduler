"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

type Item = { id: string; label: string };

const initialItems: Item[] = [
  { id: "a", label: "Item A" },
  { id: "b", label: "Item B" },
  { id: "c", label: "Item C" }
];

export default function DebugDndPage() {
  const [items, setItems] = useState<Item[]>(initialItems);

  function onDragEnd(result: DropResult) {
    console.log("DEBUG onDragEnd", result);
    const { destination, source } = result;
    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const updated = Array.from(items);
    const [moved] = updated.splice(source.index, 1);
    updated.splice(destination.index, 0, moved);
    setItems(updated);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-100">
      <h1 className="mb-4 text-lg font-semibold">Debug DnD</h1>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="list">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="w-64 bg-white rounded-xl shadow p-2 space-y-2"
            >
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(dragProvided) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      className="px-3 py-2 rounded border bg-slate-50 cursor-move"
                    >
                      {item.label}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </main>
  );
}
