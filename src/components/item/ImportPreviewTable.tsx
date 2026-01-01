"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import type { ParsedCSVItem, CSVParseError } from "@/lib/csv/item-parser";

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface ImportPreviewTableProps {
  items: ParsedCSVItem[];
  currencies: Currency[];
  onItemChange: (
    tempId: string,
    field: string,
    value: string | number | boolean,
  ) => void;
  onItemRemove: (tempId: string) => void;
  onBulkChange: (
    tempIds: string[],
    updates: Record<string, string | number | boolean>,
  ) => void;
}

export function ImportPreviewTable({
  items,
  currencies,
  onItemChange,
  onItemRemove,
  onBulkChange,
}: ImportPreviewTableProps) {
  const t = useTranslations("csvImport");
  const tCommon = useTranslations("common");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: string;
  } | null>(null);

  // Bulk edit form state
  const [bulkCurrency, setBulkCurrency] = useState("");
  const [bulkStartingBid, setBulkStartingBid] = useState("");
  const [bulkMinIncrement, setBulkMinIncrement] = useState("");

  // Only items without errors can be selected
  const selectableItems = items.filter((item) => item.errors.length === 0);

  const handleSelectAll = useCallback(() => {
    if (
      selectedIds.size === selectableItems.length &&
      selectableItems.length > 0
    ) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableItems.map((item) => item.tempId)));
    }
  }, [selectableItems, selectedIds.size]);

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

  const handleBulkPublish = useCallback(
    (publish: boolean) => {
      onBulkChange(Array.from(selectedIds), { isPublished: publish });
    },
    [selectedIds, onBulkChange],
  );

  const handleBulkApply = useCallback(() => {
    const updates: Record<string, string | number | boolean> = {};

    if (bulkCurrency) updates.currencyCode = bulkCurrency;
    if (bulkStartingBid) updates.startingBid = parseFloat(bulkStartingBid);
    if (bulkMinIncrement)
      updates.minBidIncrement = parseFloat(bulkMinIncrement);

    if (Object.keys(updates).length === 0) return;

    onBulkChange(Array.from(selectedIds), updates);
    setSelectedIds(new Set());
    setBulkCurrency("");
    setBulkStartingBid("");
    setBulkMinIncrement("");
  }, [
    selectedIds,
    bulkCurrency,
    bulkStartingBid,
    bulkMinIncrement,
    onBulkChange,
  ]);

  const handleRemoveSelected = useCallback(() => {
    selectedIds.forEach((id) => onItemRemove(id));
    setSelectedIds(new Set());
  }, [selectedIds, onItemRemove]);

  const noneSelected = selectedIds.size === 0;
  const itemsWithErrors = items.filter((item) => item.errors.length > 0);
  const hasErrors = itemsWithErrors.length > 0;

  return (
    <div className="space-y-4">
      {/* Error Summary */}
      {hasErrors && (
        <div className="alert alert-warning">
          <span className="icon-[tabler--alert-triangle] size-5"></span>
          <div>
            <p className="font-medium">
              {t("errorsFound", { count: itemsWithErrors.length })}
            </p>
            <p className="text-sm">{t("fixErrorsBeforeImport")}</p>
          </div>
        </div>
      )}

      {/* Bulk Edit Toolbar */}
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
              disabled={noneSelected}
            >
              <span className="icon-[tabler--eye] size-4"></span>
              {t("publishAll")}
            </button>
            <button
              type="button"
              className="btn btn-warning btn-sm gap-1"
              onClick={() => handleBulkPublish(false)}
              disabled={noneSelected}
            >
              <span className="icon-[tabler--eye-off] size-4"></span>
              {t("unpublishAll")}
            </button>
          </div>

          <div className="divider divider-horizontal mx-0"></div>

          {/* Bulk Currency */}
          <select
            className="select select-bordered select-sm w-28"
            value={bulkCurrency}
            onChange={(e) => setBulkCurrency(e.target.value)}
            disabled={noneSelected}
          >
            <option value="">{t("currency")}</option>
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.symbol})
              </option>
            ))}
          </select>

          {/* Bulk Starting Bid */}
          <input
            type="number"
            className="input input-bordered input-sm w-28"
            placeholder={t("startingBid")}
            value={bulkStartingBid}
            onChange={(e) => setBulkStartingBid(e.target.value)}
            disabled={noneSelected}
            min="0"
            step="0.01"
          />

          {/* Bulk Min Increment */}
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
                noneSelected ||
                (!bulkCurrency && !bulkStartingBid && !bulkMinIncrement)
              }
            >
              {t("applyToSelected")}
            </button>
          </div>

          {/* Remove Selected */}
          {!noneSelected && (
            <>
              <div className="divider divider-horizontal mx-0"></div>
              <button
                type="button"
                className="btn btn-error btn-sm gap-1"
                onClick={handleRemoveSelected}
              >
                <span className="icon-[tabler--trash] size-4"></span>
                {t("removeSelected")}
              </button>
            </>
          )}
        </div>
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
                    selectedIds.size === selectableItems.length &&
                    selectableItems.length > 0
                  }
                  onChange={handleSelectAll}
                  disabled={selectableItems.length === 0}
                />
              </th>
              <th className="w-12">#</th>
              <th className="min-w-48">{t("name")}</th>
              <th className="min-w-64">{t("description")}</th>
              <th className="w-24">{t("currency")}</th>
              <th className="w-28">{t("startingBid")}</th>
              <th className="w-28">{t("minIncrement")}</th>
              <th className="w-24">{t("status")}</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <ImportPreviewRow
                key={item.tempId}
                item={item}
                rowNumber={index + 1}
                currencies={currencies}
                isSelected={selectedIds.has(item.tempId)}
                onSelect={() => handleSelectItem(item.tempId)}
                editingCell={editingCell}
                setEditingCell={setEditingCell}
                onCellChange={(field, value) =>
                  onItemChange(item.tempId, field, value)
                }
                onRemove={() => onItemRemove(item.tempId)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
        <div className="text-center py-12 text-base-content/60">
          {t("noItems")}
        </div>
      )}
    </div>
  );
}

interface ImportPreviewRowProps {
  item: ParsedCSVItem;
  rowNumber: number;
  currencies: Currency[];
  isSelected: boolean;
  onSelect: () => void;
  editingCell: { id: string; field: string } | null;
  setEditingCell: (cell: { id: string; field: string } | null) => void;
  onCellChange: (field: string, value: string | number | boolean) => void;
  onRemove: () => void;
}

function ImportPreviewRow({
  item,
  rowNumber,
  currencies,
  isSelected,
  onSelect,
  editingCell,
  setEditingCell,
  onCellChange,
  onRemove,
}: ImportPreviewRowProps) {
  const t = useTranslations("csvImport");
  const tItem = useTranslations("item.edit");

  const hasErrors = item.errors.length > 0;
  const getFieldError = (field: string): CSVParseError | undefined =>
    item.errors.find((e) => e.field === field);

  const isEditing = (field: string) =>
    editingCell?.id === item.tempId && editingCell?.field === field;

  const currencySymbol =
    currencies.find((c) => c.code === item.currencyCode)?.symbol || "$";

  return (
    <tr
      className={`${isSelected ? "bg-primary/10" : ""} ${hasErrors ? "bg-error/5" : ""}`}
    >
      {/* Checkbox */}
      <td>
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={isSelected}
          onChange={onSelect}
          disabled={hasErrors}
          title={hasErrors ? t("cannotSelectWithErrors") : undefined}
        />
      </td>

      {/* Row Number */}
      <td className="text-base-content/50 text-sm">
        {rowNumber}
        {hasErrors && (
          <span
            className="icon-[tabler--alert-circle] size-4 text-error ml-1"
            title={item.errors.map((e) => e.message).join(", ")}
          ></span>
        )}
      </td>

      {/* Name */}
      <td>
        <EditableImportCell
          value={item.name}
          isEditing={isEditing("name")}
          onStartEdit={() => setEditingCell({ id: item.tempId, field: "name" })}
          onBlur={(value) => onCellChange("name", value)}
          type="text"
          error={getFieldError("name")}
        />
      </td>

      {/* Description */}
      <td>
        <EditableDescriptionCell
          value={item.description || ""}
          isEditing={isEditing("description")}
          onStartEdit={() =>
            setEditingCell({ id: item.tempId, field: "description" })
          }
          onBlur={(value) => onCellChange("description", value)}
          error={getFieldError("description")}
        />
      </td>

      {/* Currency */}
      <td>
        <select
          className={`select select-bordered select-sm w-full ${
            getFieldError("currencyCode") ? "select-error" : ""
          }`}
          value={item.currencyCode}
          onChange={(e) => onCellChange("currencyCode", e.target.value)}
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
        <EditableImportCell
          value={item.startingBid}
          isEditing={isEditing("startingBid")}
          onStartEdit={() =>
            setEditingCell({ id: item.tempId, field: "startingBid" })
          }
          onBlur={(value) =>
            onCellChange("startingBid", parseFloat(value as string))
          }
          type="number"
          prefix={currencySymbol}
          error={getFieldError("startingBid")}
        />
      </td>

      {/* Min Increment */}
      <td>
        <EditableImportCell
          value={item.minBidIncrement}
          isEditing={isEditing("minBidIncrement")}
          onStartEdit={() =>
            setEditingCell({ id: item.tempId, field: "minBidIncrement" })
          }
          onBlur={(value) =>
            onCellChange("minBidIncrement", parseFloat(value as string))
          }
          type="number"
          prefix={currencySymbol}
          error={getFieldError("minBidIncrement")}
        />
      </td>

      {/* Status */}
      <td>
        <button
          type="button"
          className={`badge gap-1 cursor-pointer ${
            item.isPublished ? "badge-success" : "badge-warning"
          }`}
          onClick={() => onCellChange("isPublished", !item.isPublished)}
        >
          <span
            className={`${item.isPublished ? "icon-[tabler--eye]" : "icon-[tabler--eye-off]"} size-3`}
          ></span>
          {item.isPublished ? tItem("statusPublished") : tItem("statusDraft")}
        </button>
      </td>

      {/* Remove */}
      <td>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-circle text-error"
          onClick={onRemove}
          title={t("removeItem")}
        >
          <span className="icon-[tabler--x] size-4"></span>
        </button>
      </td>
    </tr>
  );
}

interface EditableImportCellProps {
  value: string | number;
  isEditing: boolean;
  onStartEdit: () => void;
  onBlur: (value: string | number) => void;
  type: "text" | "number";
  prefix?: string;
  error?: CSVParseError;
}

function EditableImportCell({
  value,
  isEditing,
  onStartEdit,
  onBlur,
  type,
  prefix,
  error,
}: EditableImportCellProps) {
  const t = useTranslations("csvImport");
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

  const handleBlur = () => {
    onBlur(localValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onBlur(localValue);
    } else if (e.key === "Escape") {
      setLocalValue(value);
    }
  };

  if (isEditing) {
    return (
      <div>
        <input
          ref={inputRef}
          type={type}
          className={`input input-bordered input-sm w-full ${error ? "input-error" : ""}`}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          min={type === "number" ? "0" : undefined}
          step={type === "number" ? "0.01" : undefined}
        />
        {error && (
          <p className="text-error text-xs mt-1">
            {t(`validation.${error.message}`)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        className={`cursor-pointer hover:bg-base-200 px-2 py-1 rounded min-h-8 flex items-center ${
          error ? "text-error border border-error/30 bg-error/5" : ""
        }`}
        onClick={onStartEdit}
      >
        {prefix && <span className="text-base-content/50 mr-1">{prefix}</span>}
        {value || <span className="text-base-content/30">—</span>}
      </div>
      {error && (
        <p className="text-error text-xs mt-1">
          {t(`validation.${error.message}`)}
        </p>
      )}
    </div>
  );
}

interface EditableDescriptionCellProps {
  value: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onBlur: (value: string) => void;
  error?: CSVParseError;
}

function EditableDescriptionCell({
  value,
  isEditing,
  onStartEdit,
  onBlur,
  error,
}: EditableDescriptionCellProps) {
  const t = useTranslations("csvImport");
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  if (isEditing) {
    return (
      <div className="min-w-64">
        <RichTextEditor
          name="description"
          value={localValue}
          onChange={setLocalValue}
          maxLength={2000}
        />
        <div className="flex justify-end gap-2 mt-2">
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
          <button
            type="button"
            className="btn btn-primary btn-xs"
            onClick={() => onBlur(localValue)}
          >
            Save
          </button>
        </div>
        {error && (
          <p className="text-error text-xs mt-1">
            {t(`validation.${error.message}`)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        className={`cursor-pointer hover:bg-base-200 px-2 py-1 rounded min-h-8 max-w-64 truncate ${
          error ? "text-error border border-error/30 bg-error/5" : ""
        }`}
        onClick={onStartEdit}
        dangerouslySetInnerHTML={{
          __html: value || '<span class="text-base-content/30">—</span>',
        }}
      />
      {error && (
        <p className="text-error text-xs mt-1">
          {t(`validation.${error.message}`)}
        </p>
      )}
    </div>
  );
}
