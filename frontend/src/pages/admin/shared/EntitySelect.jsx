import React from "react";

/**
 * Checkbox list for selecting entities by name (e.g. laboratories, employees).
 */
export function EntityCheckboxList({ items, selectedIds, onChange, labelKey = "name", idKey = "id", variant = "equipment", listLabel }) {
  if (!items || items.length === 0) return null;
  const ids = selectedIds || [];
  const toggle = (id) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    onChange(next);
  };
  const gridClass = variant === "lab" ? "lab-checkbox-grid" : "equipment-checkbox-grid";
  const itemClass = variant === "lab" ? "lab-selection-item" : "equipment-selection-item";
  const labelClass = variant === "lab" ? "lab-checkbox-list__label" : "equipment-checkbox-list__label";
  return (
    <div className={variant === "lab" ? "lab-checkbox-list" : "equipment-checkbox-list"}>
      {listLabel && <label className={labelClass}>{listLabel}</label>}
      <div className={gridClass}>
        {items.map((item) => (
          <label key={item[idKey]} className={itemClass}>
            <input
              type="checkbox"
              checked={ids.includes(item[idKey])}
              onChange={() => toggle(item[idKey])}
            />
            <span>{item[labelKey] || item.full_name || item.title || "—"}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/**
 * Select dropdown for single entity (e.g. query, laboratory, contact employee).
 */
export function EntitySelect({ items, value, onChange, placeholder = "Выберите…", labelKey = "name", idKey = "id" }) {
  return (
    <select
      className="ui-input"
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? null : parseInt(v, 10));
      }}
    >
      <option value="">{placeholder}</option>
      {(items || []).map((item) => (
        <option key={item[idKey]} value={item[idKey]}>
          {item[labelKey] || item.full_name || item.title || `#${item[idKey]}`}
        </option>
      ))}
    </select>
  );
}
