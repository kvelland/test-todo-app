/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("todos");

    // description — optional text, max 2000 chars. Existing records read back as "".
    collection.fields.add(
      new Field({
        type: "text",
        name: "description",
        max: 2000,
      }),
    );

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("todos");
    collection.fields.removeByName("description");
    app.save(collection);
  },
);
