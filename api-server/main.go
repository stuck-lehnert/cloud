package main

import (
	"encoding/json"
	"fmt"

	"stuck-lehnert.de/cloud/api/server/config"
	"stuck-lehnert.de/cloud/api/server/database"
	"stuck-lehnert.de/cloud/api/server/resource"
	"stuck-lehnert.de/cloud/api/server/z"
)

func main() {
	db, err := database.Open(config.PostgresDSN())
	if err != nil {
		panic(err)
	}

	if err := db.Migrate("migrations"); err != nil {
		panic(err)
	}

	User, err := resource.NewTableResource(resource.TableResourceProps{
		Name:             "User",
		TableName:        "users",
		PrimaryKey:       []string{"id"},
		ModifiableFields: []string{"firstName", "lastName", "username", "email"},
		StaticFields: map[string]*resource.TableResourceStaticField{
			"id": {
				Type: z.NotNull(z.String()),
			},
			"firstName": {
				Type:   z.NotNull(z.String()),
				Column: "first_name",
			},
			"lastName": {
				Type:   z.String(),
				Column: "last_name",
			},
			"username": {
				Type: z.String(),
			},
			"email": {
				Type: z.String(),
			},
			"createdAt": {
				Type:   z.NotNull(z.DateTime()),
				Column: "created_at",
			},
			"modifiedAt": {
				Type:   z.NotNull(z.DateTime()),
				Column: "modified_at",
			},
		},
	})

	users, err := User.Attach(db, nil).FindMany(nil)
	if err != nil {
		panic(err)
	}

	rawJson, err := json.Marshal(users)
	fmt.Println(string(rawJson))

}
