/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    type: "base",
    name: "todos",
    fields: [
      // title — text, required, max 200 chars
      { type: "text", name: "title", required: true, max: 200 },
      // completed — bool, defaults to false
      { type: "bool", name: "completed" },
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
  });

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("todos");
  app.delete(collection);
});
