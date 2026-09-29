import type { Tag } from "@/lib/pocketbase";

type TagFilterProps = {
  tags: Tag[];
  selectedIds: string[];
  onToggle: (tagId: string) => void;
  onClear: () => void;
};

export default function TagFilter({ tags, selectedIds, onToggle, onClear }: TagFilterProps) {
  if (tags.length === 0) {
    return null;
  }

  const selected = new Set(selectedIds);

  return (
    <section className="tag-filter" role="region" aria-label="Filter by tag">
      <ul className="tag-filter__list">
        {tags.map((tag) => (
          <li key={tag.id}>
            <button
              type="button"
              className="tag-filter__button"
              aria-pressed={selected.has(tag.id)}
              aria-label={`Filter by tag "${tag.name}"`}
              onClick={() => onToggle(tag.id)}
            >
              {tag.name}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="tag-filter__clear" onClick={onClear}>
        Clear filter
      </button>
    </section>
  );
}
