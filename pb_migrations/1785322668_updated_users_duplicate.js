/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3052611021")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_tokenKey_6qskphpcw0` ON `users` (`tokenKey`)",
      "CREATE UNIQUE INDEX `idx_email_6qskphpcw0` ON `users` (`email`) WHERE `email` != ''"
    ],
    "name": "users"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3052611021")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_tokenKey_6qskphpcw0` ON `users_duplicate` (`tokenKey`)",
      "CREATE UNIQUE INDEX `idx_email_6qskphpcw0` ON `users_duplicate` (`email`) WHERE `email` != ''"
    ],
    "name": "users_duplicate"
  }, collection)

  return app.save(collection)
})
