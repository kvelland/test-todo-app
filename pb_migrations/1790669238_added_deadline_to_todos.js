/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("todos");

    // deadline — optional date; empty string when unset. Stored in UTC, shown in local time.
    collection.fields.add(
      new Field({
        type: "date",
        name: "deadline",
        required: false,
      }),
    );

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("todos");
    collection.fields.removeByName("deadline");
    app.save(collection);
  },
);
