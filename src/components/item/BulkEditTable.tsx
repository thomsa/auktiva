"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

export interface BulkEditItem {
  id: string;
  name: string;
  description: string | null;
  currencyCode: string;
  startingBid: number;
  minBidIncrement: number;
  isPublished: boolean;
  endDate: string | null;
  createdAt: string;
  auctionId: string;
  auctionName: string;
  thumbnailUrl: string | null;
  bidCount: number;
  currencySymbol: string;
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface BulkEditTableProps {
  items: BulkEditItem[];
  currencies: Currency[];
  onItemUpdate: (
    itemId: string,
    field: string,
    value: string | number | boolean,
  ) => Promise<void>;
  onBulkUpdate: (
    itemIds: string[],
    updates: Record<string, string | number | boolean>,
  ) => Promise<{ updated: number; skipped: number }>;
  onRefresh: () => void;
}

export function BulkEditTable({
  items,
  currencies,
  onItemUpdate,
  onBulkUpdate,
  onRefresh,
}: BulkEditTableProps) {
  const t = useTranslations("bulkEdit");
  const tCommon = useTranslations("common");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: string;
  } | null>(null);
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const [localItems, setLocalItems] = useState<BulkEditItem[]>(items);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [showBulkSuccess, setShowBulkSuccess] = useState<string | null>(null);

  // Bulk edit form state
  const [bulkCurrency, setBulkCurrency] = useState("");
  const [bulkStartingBid, setBulkStartingBid] = useState("");
  const [bulkMinIncrement, setBulkMinIncrement] = useState("");

  // Update local items when props change
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === localItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(localItems.map((item) => item.id)));
    }
  }, [localItems, selectedIds.size]);

  const handleSelectItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCellBlur = useCallback(
    async (
      itemId: string,
      field: string,
      value: string | number | boolean,
      originalValue: string | number | boolean | null,
    ) => {
      // Don't save if value hasn't changed
      if (value === originalValue) {
        setEditingCell(null);
        return;
      }

      setSavingItems((prev) => new Set(prev).add(itemId));
      try {
        await onItemUpdate(itemId, field, value);
        // Update local state
        setLocalItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, [field]: value } : item,
          ),
        );
      } catch (error) {
        console.error("Failed to save:", error);
      } finally {
        setSavingItems((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
        setEditingCell(null);
      }
    },
    [onItemUpdate],
  );

  const handleBulkPublish = useCallback(
    async (publish: boolean) => {
      if (selectedIds.size === 0) return;
      setBulkUpdating(true);
      try {
        const result = await onBulkUpdate(Array.from(selectedIds), {
          isPublished: publish,
        });
        setShowBulkSuccess(
          t("bulkResult", { updated: result.updated, skipped: result.skipped }),
        );
        setTimeout(() => setShowBulkSuccess(null), 3000);
        onRefresh();
        setSelectedIds(new Set());
      } finally {
        setBulkUpdating(false);
      }
    },
    [selectedIds, onBulkUpdate, onRefresh, t],
  );

  const handleBulkApply = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const updates: Record<string, string | number | boolean> = {};

    if (bulkCurrency) updates.currencyCode = bulkCurrency;
    if (bulkStartingBid) updates.startingBid = parseFloat(bulkStartingBid);
    if (bulkMinIncrement)
      updates.minBidIncrement = parseFloat(bulkMinIncrement);

    if (Object.keys(updates).length === 0) return;

    setBulkUpdating(true);
    try {
      const result = await onBulkUpdate(Array.from(selectedIds), updates);
      setShowBulkSuccess(
        t("bulkResult", { updated: result.updated, skipped: result.skipped }),
      );
      setTimeout(() => setShowBulkSuccess(null), 3000);
      onRefresh();
      setSelectedIds(new Set());
      setBulkCurrency("");
      setBulkStartingBid("");
      setBulkMinIncrement("");
    } finally {
      setBulkUpdating(false);
    }
  }, [
    selectedIds,
    bulkCurrency,
    bulkStartingBid,
    bulkMinIncrement,
    onBulkUpdate,
    onRefresh,
    t,
  ]);

  const selectedItems = localItems.filter((item) => selectedIds.has(item.id));
  const hasItemsWithBids = selectedItems.some((item) => item.bidCount > 0);

  const noneSelected = selectedIds.size === 0;

  return (
    <div className="space-y-4">
      {/* Bulk Edit Toolbar - always visible, disabled when nothing selected */}
      <div
        className={`card p-4 sticky top-0 z-10 ${
          noneSelected
            ? "bg-base-200/50 border border-base-300"
            : "bg-primary/5 border border-primary/20"
        }`}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div
            className={`font-semibold ${noneSelected ? "text-base-content/50" : "text-primary"}`}
          >
            {noneSelected
              ? t("selectItems")
              : t("selected", { count: selectedIds.size })}
          </div>

          <div className="divider divider-horizontal mx-0"></div>

          {/* Bulk Publish/Unpublish */}
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-success btn-sm gap-1"
              onClick={() => handleBulkPublish(true)}
              disabled={bulkUpdating || noneSelected}
            >
              <span className="icon-[tabler--eye] size-4"></span>
              {t("publishAll")}
            </button>
            <button
              type="button"
              className="btn btn-warning btn-sm gap-1"
              onClick={() => handleBulkPublish(false)}
              disabled={bulkUpdating || hasItemsWithBids || noneSelected}
              title={hasItemsWithBids ? t("cannotUnpublishWithBids") : ""}
            >
              <span className="icon-[tabler--eye-off] size-4"></span>
              {t("unpublishAll")}
            </button>
          </div>

          <div className="divider divider-horizontal mx-0"></div>

          {/* Bulk Currency */}
          <div className="flex items-center gap-2">
            <select
              className="select select-bordered select-sm w-28"
              value={bulkCurrency}
              onChange={(e) => setBulkCurrency(e.target.value)}
              disabled={hasItemsWithBids || noneSelected}
            >
              <option value="">{t("currency")}</option>
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Bulk Starting Bid */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="input input-bordered input-sm w-28"
              placeholder={t("startingBid")}
              value={bulkStartingBid}
              onChange={(e) => setBulkStartingBid(e.target.value)}
              disabled={hasItemsWithBids || noneSelected}
              min="0"
              step="0.01"
            />
          </div>

          {/* Bulk Min Increment */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="input input-bordered input-sm w-28"
              placeholder={t("minIncrement")}
              value={bulkMinIncrement}
              onChange={(e) => setBulkMinIncrement(e.target.value)}
              disabled={noneSelected}
              min="0"
              step="0.01"
            />
          </div>

          <div className="flex items-center gap-2 self-end">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedIds(new Set())}
              disabled={noneSelected}
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleBulkApply}
              disabled={
                bulkUpdating ||
                noneSelected ||
                (!bulkCurrency && !bulkStartingBid && !bulkMinIncrement)
              }
            >
              {bulkUpdating ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                t("applyToSelected")
              )}
            </button>
          </div>
        </div>

        {hasItemsWithBids && !noneSelected && (
          <div className="text-warning text-sm mt-2">
            <span className="icon-[tabler--alert-triangle] size-4 inline-block mr-1"></span>
            {t("someItemsHaveBids")}
          </div>
        )}

        {showBulkSuccess && (
          <div className="text-success text-sm mt-2">
            <span className="icon-[tabler--check] size-4 inline-block mr-1"></span>
            {showBulkSuccess}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th className="w-12">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={
                    selectedIds.size === localItems.length &&
                    localItems.length > 0
                  }
                  onChange={handleSelectAll}
                />
              </th>
              <th className="w-16"></th>
              <th className="min-w-48">{t("name")}</th>
              <th className="min-w-64">{t("description")}</th>
              <th className="w-24">{t("currency")}</th>
              <th className="w-28">{t("startingBid")}</th>
              <th className="w-28">{t("minIncrement")}</th>
              <th className="w-24">{t("status")}</th>
              <th className="w-20">{t("bids")}</th>
              <th className="min-w-32">{t("auction")}</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {localItems.map((item) => (
              <BulkEditRow
                key={item.id}
                item={item}
                currencies={currencies}
                isSelected={selectedIds.has(item.id)}
                onSelect={() => handleSelectItem(item.id)}
                editingCell={editingCell}
                setEditingCell={setEditingCell}
                onCellBlur={handleCellBlur}
                isSaving={savingItems.has(item.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {localItems.length === 0 && (
        <div className="text-center py-12 text-base-content/60">
          {t("noItems")}
        </div>
      )}
    </div>
  );
}

interface BulkEditRowProps {
  item: BulkEditItem;
  currencies: Currency[];
  isSelected: boolean;
  onSelect: () => void;
  editingCell: { id: string; field: string } | null;
  setEditingCell: (cell: { id: string; field: string } | null) => void;
  onCellBlur: (
    itemId: string,
    field: string,
    value: string | number | boolean,
    originalValue: string | number | boolean | null,
  ) => void;
  isSaving: boolean;
}

function BulkEditRow({
  item,
  currencies,
  isSelected,
  onSelect,
  editingCell,
  setEditingCell,
  onCellBlur,
  isSaving,
}: BulkEditRowProps) {
  const t = useTranslations("bulkEdit");
  const tItem = useTranslations("item.edit");
  const hasBids = item.bidCount > 0;

  const isEditing = (field: string) =>
    editingCell?.id === item.id && editingCell?.field === field;

  return (
    <tr className={isSelected ? "bg-primary/10" : ""}>
      {/* Checkbox */}
      <td>
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={isSelected}
          onChange={onSelect}
        />
      </td>

      {/* Thumbnail */}
      <td className="min-w-20 h-12">
        <Link href={`/auctions/${item.auctionId}/items/${item.id}`}>
          {item.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnailUrl}
              alt={item.name}
              className="w-12 h-12 object-cover rounded-lg"
            />
          ) : (
            <div className="w-12 h-12 bg-base-200 rounded-lg flex items-center justify-center">
              <span className="icon-[tabler--photo] size-5 text-base-content/30"></span>
            </div>
          )}
        </Link>
      </td>

      {/* Name */}
      <td>
        <EditableCell
          value={item.name}
          isEditing={isEditing("name")}
          onStartEdit={() => setEditingCell({ id: item.id, field: "name" })}
          onBlur={(value) => onCellBlur(item.id, "name", value, item.name)}
          isSaving={isSaving}
          type="text"
        />
      </td>

      {/* Description */}
      <td>
        <EditableDescriptionCell
          value={item.description || ""}
          isEditing={isEditing("description")}
          onStartEdit={() =>
            setEditingCell({ id: item.id, field: "description" })
          }
          onBlur={(value) =>
            onCellBlur(item.id, "description", value, item.description)
          }
          isSaving={isSaving}
        />
      </td>

      {/* Currency */}
      <td>
        <select
          className="select select-bordered select-sm w-full"
          value={item.currencyCode}
          onChange={(e) =>
            onCellBlur(
              item.id,
              "currencyCode",
              e.target.value,
              item.currencyCode,
            )
          }
          disabled={hasBids || isSaving}
        >
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
      </td>

      {/* Starting Bid */}
      <td>
        <EditableCell
          value={item.startingBid}
          isEditing={isEditing("startingBid")}
          onStartEdit={() =>
            setEditingCell({ id: item.id, field: "startingBid" })
          }
          onBlur={(value) =>
            onCellBlur(
              item.id,
              "startingBid",
              parseFloat(value as string),
              item.startingBid,
            )
          }
          isSaving={isSaving}
          type="number"
          disabled={hasBids}
          prefix={item.currencySymbol}
        />
      </td>

      {/* Min Increment */}
      <td>
        <EditableCell
          value={item.minBidIncrement}
          isEditing={isEditing("minBidIncrement")}
          onStartEdit={() =>
            setEditingCell({ id: item.id, field: "minBidIncrement" })
          }
          onBlur={(value) =>
            onCellBlur(
              item.id,
              "minBidIncrement",
              parseFloat(value as string),
              item.minBidIncrement,
            )
          }
          isSaving={isSaving}
          type="number"
          prefix={item.currencySymbol}
        />
      </td>

      {/* Status */}
      <td>
        <button
          type="button"
          className={`badge gap-1 cursor-pointer ${
            item.isPublished ? "badge-success" : "badge-warning"
          }`}
          onClick={() =>
            !hasBids || item.isPublished
              ? onCellBlur(
                  item.id,
                  "isPublished",
                  !item.isPublished,
                  item.isPublished,
                )
              : null
          }
          disabled={isSaving || (hasBids && item.isPublished)}
          title={
            hasBids && item.isPublished
              ? t("cannotUnpublishWithBids")
              : undefined
          }
        >
          <span
            className={`${item.isPublished ? "icon-[tabler--eye]" : "icon-[tabler--eye-off]"} size-3`}
          ></span>
          {item.isPublished ? tItem("statusPublished") : tItem("statusDraft")}
        </button>
      </td>

      {/* Bids */}
      <td>
        <span className={hasBids ? "font-semibold text-primary" : ""}>
          {item.bidCount}
        </span>
      </td>

      {/* Auction */}
      <td>
        <Link
          href={`/auctions/${item.auctionId}`}
          className="link link-hover text-sm"
        >
          {item.auctionName}
        </Link>
      </td>

      {/* Actions */}
      <td>
        <a
          href={`/auctions/${item.auctionId}/items/${item.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-sm btn-circle"
          title={t("viewItem")}
        >
          <span className="icon-[tabler--external-link] size-4"></span>
        </a>
      </td>
    </tr>
  );
}

interface EditableCellProps {
  value: string | number;
  isEditing: boolean;
  onStartEdit: () => void;
  onBlur: (value: string | number) => void;
  isSaving: boolean;
  type: "text" | "number";
  disabled?: boolean;
  prefix?: string;
}

function EditableCell({
  value,
  isEditing,
  onStartEdit,
  onBlur,
  isSaving,
  type,
  disabled,
  prefix,
}: EditableCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isSaving) {
    return (
      <div className="flex items-center gap-2">
        <span className="loading loading-spinner loading-xs"></span>
      </div>
    );
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type}
        className="input input-bordered input-sm w-full"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => onBlur(localValue)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onBlur(localValue);
          }
          if (e.key === "Escape") {
            setLocalValue(value);
            onBlur(value);
          }
        }}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "0.01" : undefined}
      />
    );
  }

  return (
    <div
      className={`cursor-pointer hover:bg-base-200 rounded px-2 py-1 -mx-2 ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      onClick={() => !disabled && onStartEdit()}
    >
      {prefix && <span className="text-base-content/60">{prefix}</span>}
      {value}
    </div>
  );
}

interface EditableDescriptionCellProps {
  value: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onBlur: (value: string) => void;
  isSaving: boolean;
}

function EditableDescriptionCell({
  value,
  isEditing,
  onStartEdit,
  onBlur,
  isSaving,
}: EditableDescriptionCellProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  if (isSaving) {
    return (
      <div className="flex items-center gap-2">
        <span className="loading loading-spinner loading-xs"></span>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="min-w-64">
        <RichTextEditor
          name="description"
          value={localValue}
          onChange={setLocalValue}
          maxLength={500}
          className="min-h-24"
        />
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            className="btn btn-primary btn-xs"
            onClick={() => onBlur(localValue)}
          >
            Save
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => {
              setLocalValue(value);
              onBlur(value);
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Strip HTML for preview
  const plainText = value.replace(/<[^>]*>/g, "").trim();

  return (
    <div
      className="cursor-pointer hover:bg-base-200 rounded px-2 py-1 -mx-2 max-w-64 truncate"
      onClick={onStartEdit}
      title={plainText}
    >
      {plainText || <span className="text-base-content/40">—</span>}
    </div>
  );
}
