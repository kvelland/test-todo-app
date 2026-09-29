"use client";

import { useState } from "react";
import type { Tag } from "@/lib/pocketbase";
import { createTag } from "@/lib/todos";
import { TAG_NAME_MAX_LENGTH, validateTagName } from "@/lib/validation";

type TagInputProps = {
  /** Accessible label for the text field. */
  label: string;
  selected: Tag[];
  availableTags: Tag[];
  onChange: (tags: Tag[]) => void;
  /** Called with a freshly created tag so the app can add it to its tag list. */
  onCreated?: (tag: Tag) => void;
  disabled?: boolean;
};

export default function TagInput({
  label,
  selected,
  availableTags,
  onChange,
  onCreated,
  disabled = false,
}: TagInputProps) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const selectedIds = new Set(selected.map((tag) => tag.id));
  const trimmed = query.trim();
  const needle = trimmed.toLowerCase();

  const suggestions = availableTags.filter(
    (tag) => !selectedIds.has(tag.id) && tag.name.toLowerCase().includes(needle),
  );

  const exactMatch = availableTags.some((tag) => tag.name.toLowerCase() === needle);
  const canCreate =
    trimmed.length > 0 &&
    !exactMatch &&
    validateTagName(
      trimmed,
      availableTags.map((tag) => tag.name),
    ).ok;

  function addTag(tag: Tag) {
    if (!selectedIds.has(tag.id)) {
      onChange([...selected, tag]);
    }
    setQuery("");
    setError(null);
  }

  async function handleCreate() {
    setError(null);
    setCreating(true);

    const result = await createTag(trimmed);

    setCreating(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onCreated?.(result.data);
    addTag(result.data);
  }

  return (
    <div className="tag-input">
      {selected.length > 0 ? (
        <ul className="tag-input__chips">
          {selected.map((tag) => (
            <li key={tag.id}>
              <span className="tag-chip">
                {tag.name}
                <button
                  type="button"
                  className="tag-chip__remove"
                  onClick={() => onChange(selected.filter((current) => current.id !== tag.id))}
                  disabled={disabled}
                  aria-label={`Remove tag "${tag.name}"`}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        type="text"
        className="tag-input__field"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setError(null);
        }}
        placeholder="Add a tag…"
        aria-label={label}
        maxLength={TAG_NAME_MAX_LENGTH}
        disabled={disabled}
      />

      {trimmed.length > 0 ? (
        <ul className="tag-input__options">
          {suggestions.map((tag) => (
            <li key={tag.id}>
              <button
                type="button"
                className="tag-input__option"
                onClick={() => addTag(tag)}
                disabled={disabled}
                aria-label={`Add tag "${tag.name}"`}
              >
                {tag.name}
              </button>
            </li>
          ))}
          {canCreate ? (
            <li>
              <button
                type="button"
                className="tag-input__option tag-input__option--create"
                onClick={() => void handleCreate()}
                disabled={disabled || creating}
                aria-label={`Create tag "${trimmed}"`}
              >
                Create tag: “{trimmed}”
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="tag-input__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
