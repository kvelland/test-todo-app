"use client";

import { SORT_LABELS, SORT_ORDERS, type SortOrder } from "@/lib/sort";

type SortControlProps = {
  value: SortOrder;
  onChange: (order: SortOrder) => void;
};

export default function SortControl({ value, onChange }: SortControlProps) {
  return (
    <div className="sort">
      <label className="sort__label" htmlFor="todo-sort">
        Sort todos
      </label>
      <select
        id="todo-sort"
        className="sort__select"
        value={value}
        onChange={(event) => onChange(event.target.value as SortOrder)}
      >
        {SORT_ORDERS.map((order) => (
          <option key={order} value={order}>
            {SORT_LABELS[order]}
          </option>
        ))}
      </select>
    </div>
  );
}
