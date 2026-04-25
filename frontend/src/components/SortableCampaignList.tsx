"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Campaign, api } from "@/lib/api";

interface RowProps {
  campaign: Campaign;
}

function SortableRow({ campaign }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: campaign.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const expired = Date.now() / 1000 > campaign.expiration;
  const statusKey = !campaign.active ? "inactive" : expired ? "expired" : "active";

  return (
    <div ref={setNodeRef} style={style} className="sortable-row">
      <button
        className="drag-handle"
        aria-label={`Drag to reorder campaign #${campaign.id}`}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <span className="sortable-row-id">#{campaign.id}</span>
      <span className="sortable-row-merchant mono">
        {campaign.merchant.slice(0, 8)}…{campaign.merchant.slice(-4)}
      </span>
      <span className="sortable-row-amount">{campaign.reward_amount.toLocaleString()} LYT</span>
      <span className="badge" data-status={statusKey}>{statusKey}</span>
    </div>
  );
}

interface Props {
  initialCampaigns: Campaign[];
}

export function SortableCampaignList({ initialCampaigns }: Props) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = campaigns.findIndex((c) => c.id === active.id);
    const newIndex = campaigns.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(campaigns, oldIndex, newIndex);

    // Optimistic update
    setCampaigns(reordered);
    setError(null);
    setSaving(true);

    try {
      await api.reorderCampaigns(reordered.map((c) => c.id));
    } catch {
      // Rollback on failure
      setCampaigns(campaigns);
      setError("Failed to save order. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}
      {saving && <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 8 }}>Saving order…</p>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={campaigns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="sortable-list">
            {campaigns.map((c) => (
              <SortableRow key={c.id} campaign={c} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
