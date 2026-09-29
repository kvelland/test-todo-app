import type { Tag } from "@/lib/pocketbase";

type TagChipsProps = {
  tags: Tag[];
  /** When provided, each chip becomes a button that applies the tag as a filter. */
  onSelect?: (tagId: string) => void;
};

export default function TagChips({ tags, onSelect }: TagChipsProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <ul className="tag-chips">
      {tags.map((tag) => (
        <li key={tag.id}>
          {onSelect ? (
            <button
              type="button"
              className="tag-chip tag-chip--button"
              onClick={() => onSelect(tag.id)}
              aria-label={`Filter by tag "${tag.name}"`}
            >
              {tag.name}
            </button>
          ) : (
            <span className="tag-chip">{tag.name}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
