/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_443946600")

  // update collection data
  unmarshal({
    "name": "users"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_443946600")

  // update collection data
  unmarshal({
    "name": "users_duplicate"
  }, collection)

  return app.save(collection)
})
