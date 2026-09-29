/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const tags = new Collection({
      type: "base",
      name: "tags",
      fields: [
        // name — text, required, max 30 chars, unique
        { type: "text", name: "name", required: true, max: 30 },
        // created / updated — autodate
        { type: "autodate", name: "created", onCreate: true, onUpdate: false },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
      // Public (no-auth) API rules — single-user for now; auth is a later round.
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
      // The index is case-sensitive in SQLite; case-insensitive uniqueness is
      // enforced in the app (validateTagName + createTag).
      indexes: ["CREATE UNIQUE INDEX `idx_tags_name` ON `tags` (`name`)"],
    });

    app.save(tags);

    const todos = app.findCollectionByNameOrId("todos");
    todos.fields.add(
      new Field({
        type: "relation",
        name: "tags",
        required: false,
        collectionId: tags.id,
        cascadeDelete: false,
        maxSelect: 999,
      }),
    );
    app.save(todos);
  },
  (app) => {
    const todos = app.findCollectionByNameOrId("todos");
    todos.fields.removeByName("tags");
    app.save(todos);

    const tags = app.findCollectionByNameOrId("tags");
    app.delete(tags);
  },
);
