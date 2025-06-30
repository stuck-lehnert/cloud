package main

import (
	"fmt"

	"github.com/Oudwins/zog"
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
				Type: zog.String().Required(),
			},
			"firstName": {
				Type:   zog.String().Required(),
				Column: "first_name",
			},
			"lastName": {
				Type:   zog.String(),
				Column: "last_name",
			},
			"username": {
				Type: zog.String(),
			},
			"email": {
				Type: zog.String(),
			},
			"createdAt": {
				Type:   zog.Time().Required(),
				Column: "created_at",
			},
			"modifiedAt": {
				Type:   zog.Time().Required(),
				Column: "modified_at",
			},
		},
	})

	fooUser, err := User.Attach(db, nil).FindUnique(map[string]any{"id": "0197bc2a6b41b683328b"})
	if err != nil {
		panic(err)
	}

	z.Optional[string](z.String().Lower().V())

	fmt.Println(fooUser)
}
